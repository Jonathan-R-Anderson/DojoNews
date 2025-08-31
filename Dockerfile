# Simple Flask app container
FROM python:3.10-slim
WORKDIR /app
COPY app /app
# Install dependencies using uv if available
RUN pip install --no-cache-dir uv || true \
    && (cd /app && uv pip install --system .) || true
EXPOSE 1283
CMD ["python", "app.py"]
