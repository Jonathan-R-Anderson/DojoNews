FROM debian:stable-slim

RUN apt-get update && apt-get install -y honeyd iproute2 \
    && rm -rf /var/lib/apt/lists/*

COPY honeyd.conf /etc/honeyd/honeyd.conf
COPY fakeweb.sh /usr/local/bin/fakeweb.sh
RUN chmod +x /usr/local/bin/fakeweb.sh

RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh

CMD ["honeyd", "-d", "-f", "/etc/honeyd/honeyd.conf"]
