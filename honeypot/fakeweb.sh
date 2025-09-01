#!/bin/sh
# Simple fake HTTP response for honeypot
# Each connection gets its own environment with port information.
read request
PORT="${HONEYD_LOCAL_PORT:-$HONEYD_PORT}"
MESSAGE="Hello from port ${PORT}"
printf 'HTTP/1.1 200 OK\r\nContent-Length: %d\r\n\r\n%s' "${#MESSAGE}" "$MESSAGE"
