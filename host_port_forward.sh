#!/usr/bin/env bash
# Safe, idempotent port forwarder to a Docker container.
# Usage:
#   sudo ./host_port_forward.sh -c <container_name> -i <ext_iface> -p "443,8443"
# Options:
#   -c  container name (required)
#   -i  external interface to match (e.g., eth0) (required)
#   -p  comma-separated TCP port list to forward (required)
#   -x  comma-separated ports to exclude (optional)
#   --cleanup   remove previously-added rules and exit
#
# Notes:
# - Only forwards listed TCP ports on the specified interface.
# - Skips ports already bound on the host or published by other containers.
# - Creates custom chains HPF_PREROUTING / HPF_POSTROUTING and jump rules.
# - Requires iptables (nft backend is fine).

set -euo pipefail

CHAIN_PRE="HPF_PREROUTING"
CHAIN_POST="HPF_POSTROUTING"

CONTAINER=""
IFACE=""
PORTS=""
EXCLUDES=""
CLEANUP=0

err() { echo "ERROR: $*" >&2; exit 1; }
need_root() { [ "$(id -u)" -eq 0 ] || err "Run as root."; }

has_cmd() { command -v "$1" >/dev/null 2>&1; }

cleanup_rules() {
  # Remove custom chain contents and delete chains; remove jump rules.
  for table in nat; do
    # Delete jump rules if present
    iptables -t "$table" -S PREROUTING | grep -q " -j $CHAIN_PRE" && iptables -t "$table" -D PREROUTING -j "$CHAIN_PRE" || true
    iptables -t "$table" -S POSTROUTING | grep -q " -j $CHAIN_POST" && iptables -t "$table" -D POSTROUTING -j "$CHAIN_POST" || true
    # Flush & delete chains
    iptables -t "$table" -F "$CHAIN_PRE" 2>/dev/null || true
    iptables -t "$table" -X "$CHAIN_PRE" 2>/dev/null || true
    iptables -t "$table" -F "$CHAIN_POST" 2>/dev/null || true
    iptables -t "$table" -X "$CHAIN_POST" 2>/dev/null || true
  done
}

ensure_chains() {
  # Create chains if missing, and ensure single jump from PREROUTING/POSTROUTING
  iptables -t nat -N "$CHAIN_PRE" 2>/dev/null || true
  iptables -t nat -N "$CHAIN_POST" 2>/dev/null || true

  iptables -t nat -C PREROUTING -j "$CHAIN_PRE" 2>/dev/null || iptables -t nat -I PREROUTING 1 -j "$CHAIN_PRE"
  iptables -t nat -C POSTROUTING -j "$CHAIN_POST" 2>/dev/null || iptables -t nat -I POSTROUTING 1 -j "$CHAIN_POST"
}

parse_csv() {
  local csv="$1"; local -n out_arr="$2"
  IFS=',' read -r -a out_arr <<<"$csv"
  # trim spaces
  for i in "${!out_arr[@]}"; do
    out_arr[$i]="${out_arr[$i]//[[:space:]]/}"
  done
}

list_host_used_ports() {
  # TCP ports already LISTENing on the host
  ss -H -ltn 2>/dev/null | awk '{print $4}' | awk -F: '{print $NF}' | grep -E '^[0-9]+$' | sort -n | uniq || true
}

list_docker_published_ports() {
  # Host-side published ports from "docker ps"
  docker ps --format '{{.Ports}}' \
    | tr ',' '\n' \
    | sed -n 's/.*0\.0\.0\.0:\([0-9]\+\)->.*/\1/p; s/.*:\([0-9]\+\)->.*/\1/p' \
    | sort -n | uniq || true
}

forward_port() {
  local port="$1"
  local comment="HPF:c=${CONTAINER}:p=${port}:i=${IFACE}"

  # DNAT: external iface, dport -> container:port
  iptables -t nat -A "$CHAIN_PRE" \
    -i "$IFACE" -p tcp --dport "$port" \
    -m comment --comment "$comment" \
    -j DNAT --to-destination "${CONTAINER_IP}:${port}"

  # MASQUERADE: replies to that container/port
  iptables -t nat -A "$CHAIN_POST" \
    -p tcp -d "$CONTAINER_IP" --dport "$port" \
    -m comment --comment "$comment" \
    -j MASQUERADE
}

while (( "$#" )); do
  case "$1" in
    -c) CONTAINER="${2:-}"; shift 2;;
    -i) IFACE="${2:-}"; shift 2;;
    -p) PORTS="${2:-}"; shift 2;;
    -x) EXCLUDES="${2:-}"; shift 2;;
    --cleanup) CLEANUP=1; shift;;
    -h|--help)
      sed -n '1,35p' "$0"; exit 0;;
    *)
      err "Unknown arg: $1 (use -h for help)";;
  esac
done

need_root

if [ "$CLEANUP" -eq 1 ]; then
  cleanup_rules
  echo "Cleaned up custom forwarding chains."
  exit 0
fi

[ -n "$CONTAINER" ] || err "-c <container_name> is required"
[ -n "$IFACE" ]     || err "-i <external_iface> is required (e.g., eth0)"
[ -n "$PORTS" ]     || err "-p <comma-separated ports> is required"

has_cmd docker || err "docker not found"
has_cmd ss || err "'ss' not found (install iproute2)"

# Resolve container IP (prefer user-defined networks, fall back to bridge)
CONTAINER_IP="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "$CONTAINER" 2>/dev/null \
  | awk '{print $1}')"
[ -n "$CONTAINER_IP" ] || err "Could not resolve IP for container '$CONTAINER'"

# Build lists
declare -a PORT_LIST EXCL_LIST
parse_csv "$PORTS" PORT_LIST
[ -n "$EXCLUDES" ] && parse_csv "$EXCLUDES" EXCL_LIST || EXCL_LIST=()

# Compute skip sets: host used + docker published + explicit excludes
HOST_USED="$(list_host_used_ports || true)"
DOCKER_PUB="$(list_docker_published_ports || true)"

# Make cleanup idempotent then (re)create our chains
cleanup_rules
ensure_chains

# Build a skip lookup
declare -A SKIP
for p in $HOST_USED; do SKIP["$p"]=1; done
for p in $DOCKER_PUB; do SKIP["$p"]=1; done
for p in "${EXCL_LIST[@]}"; do SKIP["$p"]=1; done

# Add forwards for requested ports not skipped
ADDED=()
SKIPPED=()

for p in "${PORT_LIST[@]}"; do
  [[ "$p" =~ ^[0-9]+$ ]] || { SKIPPED+=("$p (non-numeric)"); continue; }
  if [[ -n "${SKIP[$p]:-}" ]]; then
    SKIPPED+=("$p (in use/published/excluded)")
    continue
  fi
  forward_port "$p"
  ADDED+=("$p")
done

echo "Container: $CONTAINER ($CONTAINER_IP)"
echo "Interface: $IFACE"
if [ "${#ADDED[@]}" -gt 0 ]; then
  echo "Forwarded ports: ${ADDED[*]}"
else
  echo "Forwarded ports: (none)"
fi
if [ "${#SKIPPED[@]}" -gt 0 ]; then
  echo "Skipped ports:   ${SKIPPED[*]}"
fi
echo
echo "To remove these rules later:"
echo "  sudo $0 --cleanup"
