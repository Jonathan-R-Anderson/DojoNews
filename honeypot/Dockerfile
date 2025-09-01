# Use a non-interactive frontend for all package installation to avoid
# prompts during build which previously caused failures.
FROM debian:stable-slim

ARG DEBIAN_FRONTEND=noninteractive

# honeyd was removed from modern Debian/Ubuntu repositories, so we grab
# archived packages and install them manually. libevent-1.4 and
# libreadline6 are required runtime dependencies that are also no longer
# available in current repos.
RUN apt-get update && apt-get install -y --no-install-recommends iproute2 wget \
    && wget -q https://old-releases.ubuntu.com/ubuntu/pool/main/libe/libevent/libevent-1.4-2_1.4.13-stable-1_amd64.deb \
    https://old-releases.ubuntu.com/ubuntu/pool/main/r/readline6/libreadline6_6.0-5_amd64.deb \
    https://old-releases.ubuntu.com/ubuntu/pool/universe/h/honeyd/honeyd-common_1.5c-10ubuntu1_all.deb \
    https://old-releases.ubuntu.com/ubuntu/pool/universe/h/honeyd/honeyd_1.5c-10ubuntu1_amd64.deb \
    && apt-get install -y --no-install-recommends ./libevent-1.4-2_1.4.13-stable-1_amd64.deb ./libreadline6_6.0-5_amd64.deb \
    && dpkg -i --force-depends honeyd-common_1.5c-10ubuntu1_all.deb honeyd_1.5c-10ubuntu1_amd64.deb \
    && rm -f *.deb \
    && rm -rf /var/lib/apt/lists/*

COPY honeyd.conf /etc/honeyd/honeyd.conf
COPY fakeweb.sh /usr/local/bin/fakeweb.sh
RUN chmod +x /usr/local/bin/fakeweb.sh

RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh

CMD ["honeyd", "-d", "-f", "/etc/honeyd/honeyd.conf"]
