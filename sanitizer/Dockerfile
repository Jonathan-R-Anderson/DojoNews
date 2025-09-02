FROM python:3.11-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
RUN apk add --no-cache build-base libffi-dev && \
    rm -rf /var/cache/apk/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py ./app.py
COPY config.example.yml /etc/gatekeeper/config.yml

# Custom handler for missing commands
RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh
ENV SERVICE_NAME=sanitizer
ENV LOG_FILE=/logs/sanitizer.log
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV UPSTREAM_URL=http://yourapp:8000
ENV SANITIZER_CONFIG=/etc/gatekeeper/config.yml
EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
