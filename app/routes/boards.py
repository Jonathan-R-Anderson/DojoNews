from flask import Blueprint, jsonify, request
from settings import Settings
from web3 import Web3

boardsBlueprint = Blueprint("boards", __name__)


@boardsBlueprint.route("/api/v1/boards", methods=["POST"])
def create_board():
    """Create a new board via the Board contract."""
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    banner = data.get("banner", "")
    moderators = data.get("moderators", [])
    if not name:
        return jsonify({"error": "name is required"}), 400

    contract_info = Settings.BLOCKCHAIN_CONTRACTS["Board"]
    w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
    contract = w3.eth.contract(address=contract_info["address"], abi=contract_info["abi"])
    try:
        tx_hash = contract.functions.createBoard(name, banner, moderators).transact()
        return jsonify({"txHash": tx_hash.hex()}), 200
    except Exception as exc:  # pragma: no cover - external call
        return jsonify({"error": str(exc)}), 500
