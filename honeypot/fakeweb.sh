#!/bin/sh
# Simple fake HTTP response for honeypot
read request
printf 'HTTP/1.1 200 OK\r\nContent-Length: 12\r\n\r\nHello World!'
