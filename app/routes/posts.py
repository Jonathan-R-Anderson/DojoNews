from flask import Blueprint, jsonify, request
from settings import Settings
from web3 import Web3

postsBlueprint = Blueprint("posts", __name__)


@postsBlueprint.route("/api/v1/posts", methods=["POST"])
def create_post():
    """Create a new post via the Posts contract."""
    data = request.get_json(silent=True) or {}
    board_id = data.get("boardId")
    username = data.get("username", "")
    email = data.get("email", "")
    subject = data.get("subject", "")
    body = data.get("body")
    if board_id is None or body is None:
        return jsonify({"error": "boardId and body are required"}), 400

    contract_info = Settings.BLOCKCHAIN_CONTRACTS["Posts"]
    w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
    contract = w3.eth.contract(address=contract_info["address"], abi=contract_info["abi"])
    try:
        tx_hash = contract.functions.createPost(
            board_id, username, email, subject, body
        ).transact()
        return jsonify({"txHash": tx_hash.hex()}), 200
    except Exception as exc:  # pragma: no cover - external call
        return jsonify({"error": str(exc)}), 500
