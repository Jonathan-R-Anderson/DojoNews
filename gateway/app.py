import os
import logging
from flask import Flask, request, Response
import requests


LOG_FILE = os.environ.get("LOG_FILE", "/logs/gateway.log")
logging.basicConfig(
    level=logging.INFO,
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# The gateway acts purely as a proxy and should not attempt to serve static
# files itself.  Flask will automatically serve files from a ``static``
# directory unless this behaviour is explicitly disabled.  When that happens
# requests to paths such as ``/static/js/app.js`` never hit our proxy logic and
# are instead handled (and potentially 404'd) by Flask itself, meaning they are
# not forwarded to upstream services and are missing from the logs.  By
# constructing the application with ``static_folder=None`` we ensure *all*
# requests pass through the proxy code below.
app = Flask(__name__, static_folder=None)

BUNKER_URL = os.environ.get("BUNKER_URL", "http://bunkerweb:8080")
ANNOY_URL = os.environ.get("ANNOY_URL", "http://annoyingsite:4000")
BANNED_IPS_FILE = os.environ.get("BANNED_IPS_FILE", "/banned/banned_ips.list")


def is_ip_banned(ip: str) -> bool:
    """Check if the given IP is listed in the fail2ban banned file."""
    try:
        with open(BANNED_IPS_FILE) as fh:
            banned = {
                line.strip()
                for line in fh
                if line.strip() and not line.lstrip().startswith('#')
            }
        logger.debug(
            "Loaded %d banned IP(s) from %s", len(banned), BANNED_IPS_FILE
        )
    except FileNotFoundError:
        logger.warning("Banned IPs file %s not found", BANNED_IPS_FILE)
        return False
    banned_match = ip in banned
    if banned_match:
        logger.info("IP %s is banned", ip)
    return banned_match


def is_malicious(req):
    ip = request.remote_addr
    ua = req.headers.get("User-Agent", "").lower()
    banned = is_ip_banned(ip)
    malicious = banned or "curl" in ua or "python-requests" in ua
    logger.info(
        "Request from %s UA=%s banned=%s malicious=%s",
        ip,
        ua,
        banned,
        malicious,
    )
    return malicious


@app.route('/', defaults={'path': ''})
@app.route(
    '/<path:path>',
    methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
)
def proxy(path):
    def forward(target_url):
        url = f"{target_url}/{path}"
        return requests.request(
            method=request.method,
            url=url,
            headers={k: v for k, v in request.headers if k.lower() != 'host'},
            data=request.get_data(),
            cookies=request.cookies,
            allow_redirects=False,
        )

    target = ANNOY_URL if is_malicious(request) else BUNKER_URL
    logger.info("Forwarding path '%s' to %s", path, target)
    resp = forward(target)

    if resp.status_code == 404 and target != ANNOY_URL:
        logger.warning(
            "Received 404 from %s, falling back to annoyingsite", target
        )
        resp = forward(ANNOY_URL)

    excluded = {
        'content-encoding',
        'content-length',
        'transfer-encoding',
        'connection',
    }
    headers = [
        (name, value)
        for name, value in resp.raw.headers.items()
        if name.lower() not in excluded
    ]
    return Response(resp.content, resp.status_code, headers)


@app.after_request
def log_response(response: Response) -> Response:
    """Log the final response for every proxied request."""
    logger.info("%s %s -> %s", request.method, request.path, response.status)
    return response


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)

