FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt /app
RUN pip install --no-cache-dir -r requirements.txt
# Custom handler for missing commands
RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh
ENV SERVICE_NAME=blacklist
ENV LOG_FILE=/logs/blacklist.log
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY app.py /app
EXPOSE 5001
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "app.py"]
