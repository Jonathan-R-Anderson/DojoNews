"""Blueprint providing internal API endpoints."""
from flask import Blueprint, jsonify, request
import requests
from settings import Settings

apiBlueprint = Blueprint("api", __name__, url_prefix="/api")

_BASE = f"http://{Settings.BLACKLIST_API_HOST}:{Settings.BLACKLIST_API_PORT}"


@apiBlueprint.route("/blacklist", methods=["GET"])
def get_blacklist():
    try:
        r = requests.get(f"{_BASE}/blacklist", timeout=5)
        data = r.json()
    except Exception:
        data = []
    posts = [item["contentID"] for item in data if item.get("type") == "post"]
    comments = [item["contentID"] for item in data if item.get("type") == "comment"]
    return jsonify({"posts": posts, "comments": comments})


@apiBlueprint.route("/blacklist", methods=["POST"])
def add_blacklist():
    payload = request.get_json(force=True)
    try:
        r = requests.post(f"{_BASE}/blacklist", json=payload, timeout=5)
        return jsonify(r.json()), r.status_code
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500
