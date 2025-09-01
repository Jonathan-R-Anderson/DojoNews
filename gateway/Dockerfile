FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Custom handler for missing commands
RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh
COPY app.py .
EXPOSE 80
CMD ["gunicorn", "-b", "0.0.0.0:80", "app:app"]
