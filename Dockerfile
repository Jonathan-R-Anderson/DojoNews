# Simple Flask app container
FROM python:3.10-slim
WORKDIR /app
COPY app /app
# Custom handler for missing commands
RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh
# Logging configuration
ENV SERVICE_NAME=web
ENV LOG_FILE=/logs/web.log
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
# Configure DNS to ensure external resources resolve during build
RUN printf 'nameserver 8.8.8.8\nnameserver 1.1.1.1\n' > /etc/resolv.conf
# Install Node.js and WebTorrent CLI
# Use the official pre-built Node.js binaries instead of Debian packages to
# avoid hitting the Debian mirrors during build.  The image used in tests runs
# in an isolated environment where the Debian repositories are unreachable,
# which previously caused ``apt-get`` to fail and the build to abort.  By
# downloading the Node.js tarball directly we remove the dependency on the
# Debian package mirrors.
ENV NODE_VERSION=20.11.1
RUN python - <<'PY'
import io
import os
import tarfile
import urllib.request

version = os.environ["NODE_VERSION"]
url = f"https://nodejs.org/dist/v{version}/node-v{version}-linux-x64.tar.xz"
data = urllib.request.urlopen(url).read()
with tarfile.open(fileobj=io.BytesIO(data), mode="r:xz") as tar:
    tar.extractall("/usr/local")
os.rename(f"/usr/local/node-v{version}-linux-x64", "/usr/local/node")
PY
ENV PATH="/usr/local/node/bin:${PATH}"
RUN npm install -g webtorrent-cli
# Install Python dependencies using uv if available, fall back to pip
RUN (pip install --no-cache-dir uv && uv pip install --system -r requirements.txt) || \
    pip install --no-cache-dir -r requirements.txt
EXPOSE 80
ENTRYPOINT ["/entrypoint.sh"]
CMD ["python", "app.py"]
