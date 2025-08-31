"""Blueprint providing generic smart contract interaction endpoints."""
from flask import Blueprint, jsonify, request
from settings import Settings
from web3 import Web3
import json

contractsBlueprint = Blueprint("contracts", __name__, url_prefix="/api/v1/contracts")


@contractsBlueprint.route("", methods=["GET"])
def list_contracts():
    """Return available smart contract addresses."""
    contracts = {
        name: {"address": info.get("address", "")}
        for name, info in Settings.BLOCKCHAIN_CONTRACTS.items()
    }
    return jsonify(contracts)


@contractsBlueprint.route("/<string:contract_name>", methods=["GET"])
def get_contract(contract_name):
    """Return address and ABI for a specific contract."""
    info = Settings.BLOCKCHAIN_CONTRACTS.get(contract_name)
    if not info:
        return jsonify({"error": "Unknown contract"}), 404
    return jsonify({"address": info.get("address", ""), "abi": info.get("abi", [])})


@contractsBlueprint.route("/<string:contract_name>/<string:method>", methods=["POST"])
def interact(contract_name, method):
    """Interact with a contract method using call or transact."""
    info = Settings.BLOCKCHAIN_CONTRACTS.get(contract_name)
    if not info:
        return jsonify({"error": "Unknown contract"}), 404

    payload = request.get_json(silent=True) or {}
    params = payload.get("params", [])
    tx_options = payload.get("txOptions", {})
    action = payload.get("action", "call")

    w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
    contract = w3.eth.contract(address=info["address"], abi=info["abi"])
    func = getattr(contract.functions, method, None)
    if func is None:
        return jsonify({"error": "Unknown function"}), 400

    try:
        if action == "transact":
            tx_hash = func(*params).transact(tx_options)
            return jsonify({"txHash": tx_hash.hex()})
        result = func(*params).call(tx_options)
        return jsonify({"result": json.loads(Web3.to_json(result))})
    except Exception as exc:  # pragma: no cover - external call
        return jsonify({"error": str(exc)}), 500
