#!/bin/sh
# Start DojoNews stack and forward ports to the honeypot container
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run as root" >&2
  exit 1
fi

CONTAINER_NAME="dojonews-honeypot"

# Build and start the Docker Compose stack
docker compose up -d --build

# Wait for the honeypot container to be running
until [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null)" = "true" ]; do
  sleep 1
done

# Forward host ports (except 22 and 80) to the container
"$(dirname "$0")/host_port_forward.sh" "$CONTAINER_NAME"
