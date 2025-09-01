import os
from flask import Flask, request, Response
import requests

app = Flask(__name__)

BUNKER_URL = os.environ.get("BUNKER_URL", "http://bunkerweb:8080")
ANNOY_URL = os.environ.get("ANNOY_URL", "http://annoyingsite:4000")
BANNED_IPS_FILE = os.environ.get("BANNED_IPS_FILE", "/banned/banned_ips.list")


def is_ip_banned(ip: str) -> bool:
    """Check if the given IP is listed in the fail2ban banned file."""
    try:
        with open(BANNED_IPS_FILE) as fh:
            banned = {line.strip() for line in fh if line.strip()}
    except FileNotFoundError:
        return False
    return ip in banned


def is_malicious(req):
    if is_ip_banned(request.remote_addr):
        return True
    ua = req.headers.get("User-Agent", "").lower()
    return "curl" in ua or "python-requests" in ua


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
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
    resp = forward(target)

    if resp.status_code == 404 and target != ANNOY_URL:
        resp = forward(ANNOY_URL)

    excluded = {'content-encoding', 'content-length', 'transfer-encoding', 'connection'}
    headers = [(name, value) for name, value in resp.raw.headers.items() if name.lower() not in excluded]
    return Response(resp.content, resp.status_code, headers)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
