from flask import Blueprint, jsonify, request
from settings import Settings
from web3 import Web3

commentsBlueprint = Blueprint("comments", __name__)


@commentsBlueprint.route("/api/v1/comments", methods=["POST"])
def add_comment():
    data = request.get_json(silent=True) or {}
    post_id = data.get("postID")
    content = data.get("content")
    if post_id is None or not content:
        return jsonify({"error": "postID and content are required"}), 400

    contract_info = Settings.BLOCKCHAIN_CONTRACTS["CommentStorage"]
    w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
    contract = w3.eth.contract(address=contract_info["address"], abi=contract_info["abi"])
    try:
        tx_hash = contract.functions.addComment(post_id, content).transact()
        return jsonify({"txHash": tx_hash.hex()}), 200
    except Exception as exc:  # pragma: no cover - external call
        return jsonify({"error": str(exc)}), 500
