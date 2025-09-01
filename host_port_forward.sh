#!/bin/sh
# Forward all host ports except 22 and 80 to a Docker container.
# Usage: ./host_port_forward.sh <container_name>
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root" >&2
  exit 1
fi

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <container_name>" >&2
  exit 1
fi

CONTAINER_NAME="$1"

# Resolve container IP address
CONTAINER_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$CONTAINER_NAME" 2>/dev/null)

if [ -z "$CONTAINER_IP" ]; then
  echo "Could not resolve IP for container '$CONTAINER_NAME'" >&2
  exit 1
fi

# Forward all TCP ports except 22 and 80 to the container
iptables -t nat -A PREROUTING -p tcp -m multiport ! --dports 22,80 -j DNAT --to-destination "$CONTAINER_IP"
iptables -t nat -A POSTROUTING -p tcp -d "$CONTAINER_IP" -m multiport ! --dports 22,80 -j MASQUERADE

echo "Forwarding all host TCP ports except 22 and 80 to $CONTAINER_NAME ($CONTAINER_IP)"
