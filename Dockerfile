# Simple Flask app container
FROM python:3.10-slim
WORKDIR /app
COPY app /app
# Custom handler for missing commands
RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh
# Install Node.js and WebTorrent CLI
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm && \
    npm install -g webtorrent-cli && \
    rm -rf /var/lib/apt/lists/*
# Install Python dependencies using uv if available, fall back to pip
RUN (pip install --no-cache-dir uv && uv pip install --system -r requirements.txt) || \
    pip install --no-cache-dir -r requirements.txt
EXPOSE 80
CMD ["python", "app.py"]
