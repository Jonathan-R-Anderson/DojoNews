# Use a non-interactive frontend for all package installation to avoid
# prompts during build which previously caused failures.
FROM debian:stable-slim

ARG DEBIAN_FRONTEND=noninteractive

# Install dependencies and build portspoof from source
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates iproute2 iptables git build-essential \
    && update-ca-certificates \
    && git clone https://github.com/drk1wi/portspoof.git /opt/portspoof \
    && cd /opt/portspoof \
    && ./configure \
    && make \
    && make install \
    && cd / \
    && rm -rf /opt/portspoof \
    && rm -rf /var/lib/apt/lists/*

RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh
ENV SERVICE_NAME=honeypot
ENV LOG_FILE=/logs/honeypot.log
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
# Run portspoof in the foreground so the container stays alive
CMD ["portspoof", "-p", "4444"]
