#!/bin/sh
# Build and run the honeypot container with all ports forwarded
set -e

IMAGE="honeypot"
DIR="$(dirname "$0")"

docker build -t "$IMAGE" "$DIR"
# Use host networking so every host port is forwarded into the container
# Capabilities allow portspoof to manage iptables and bind low ports
if ! docker ps --format '{{.Names}}' | grep -q "^${IMAGE}$"; then
  docker run -d --name "$IMAGE" --network host \
    --cap-add=NET_ADMIN --cap-add=NET_RAW "$IMAGE"
fi

