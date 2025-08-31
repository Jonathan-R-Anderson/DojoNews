# Simple Flask app container
FROM python:3.10-slim
WORKDIR /app
COPY app /app
# Install dependencies using uv if available, fall back to pip
RUN (pip install --no-cache-dir uv && uv pip install --system .) || \
    pip install --no-cache-dir .
EXPOSE 1283
CMD ["python", "app.py"]
