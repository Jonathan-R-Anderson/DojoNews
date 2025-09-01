#!/bin/sh
set -e
: "${LOG_FILE:=/logs/container.log}"
: "${SERVICE_NAME:=container}"
mkdir -p "$(dirname "$LOG_FILE")"
{
  echo "==== $(date -u '+%Y-%m-%d %H:%M:%S') UTC ===="
  echo "Starting $SERVICE_NAME container"
  echo "Command: $*"
  echo "Environment:"
  env
  echo "==============================="
} >> "$LOG_FILE"
# Redirect all ports except 22 and 80 to portspoof (TCP and UDP)
iptables -t nat -N PREPORTSPOOF 2>/dev/null || true
iptables -t nat -F PREPORTSPOOF
iptables -t nat -N PORTSPOOF 2>/dev/null || true
iptables -t nat -F PORTSPOOF
iptables -t nat -A PORTSPOOF -p tcp -j REDIRECT --to-ports 4444
iptables -t nat -A PORTSPOOF -p udp -j REDIRECT --to-ports 4444
iptables -t nat -A PREPORTSPOOF -p tcp --dport 22 -j RETURN
iptables -t nat -A PREPORTSPOOF -p udp --dport 22 -j RETURN
iptables -t nat -A PREPORTSPOOF -p tcp --dport 80 -j RETURN
iptables -t nat -A PREPORTSPOOF -p udp --dport 80 -j RETURN
iptables -t nat -A PREPORTSPOOF -p tcp -j PORTSPOOF
iptables -t nat -A PREPORTSPOOF -p udp -j PORTSPOOF
iptables -t nat -D PREROUTING -j PREPORTSPOOF 2>/dev/null || true
iptables -t nat -A PREROUTING -j PREPORTSPOOF

exec "$@"
