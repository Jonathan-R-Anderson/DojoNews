import os
from flask import Flask, request, Response
import requests

app = Flask(__name__)

BUNKER_URL = os.environ.get('BUNKER_URL', 'http://bunkerweb:8080')
ANNOY_URL = os.environ.get('ANNOY_URL', 'http://annoyingsite:4000')


def is_malicious(req):
    ua = req.headers.get('User-Agent', '').lower()
    return 'curl' in ua or 'python-requests' in ua


def is_banned(req):
    ip = req.headers.get('X-Forwarded-For', req.remote_addr)
    try:
        with open('/fail2ban/banned-proxies.list') as f:
            banned = {line.strip() for line in f if line.strip()}
    except FileNotFoundError:
        banned = set()
    return ip in banned


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'])
def proxy(path):
    target = ANNOY_URL if is_malicious(request) or is_banned(request) else BUNKER_URL
    url = f"{target}/{path}"
    resp = requests.request(
        method=request.method,
        url=url,
        headers={k: v for k, v in request.headers if k.lower() != 'host'},
        data=request.get_data(),
        cookies=request.cookies,
        allow_redirects=False,
    )
    excluded = {'content-encoding', 'content-length', 'transfer-encoding', 'connection'}
    headers = [(name, value) for name, value in resp.raw.headers.items() if name.lower() not in excluded]
    return Response(resp.content, resp.status_code, headers)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
