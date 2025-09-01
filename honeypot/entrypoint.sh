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
exec "$@"
