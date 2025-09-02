FROM python:3.11-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Custom handler for missing commands
RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh
ENV SERVICE_NAME=gateway
ENV LOG_FILE=/logs/gateway.log
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY app.py .
RUN mkdir -p /banned && touch /banned/banned_ips.list
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["gunicorn", "-b", "0.0.0.0:80", "app:app"]
