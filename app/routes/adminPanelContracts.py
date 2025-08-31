"""Admin endpoints for managing and interacting with smart contracts.

This blueprint mirrors the generic contract interaction endpoints exposed under
``/api/v1/contracts`` but restricts access to authenticated administrators. It
also keeps the previous ability for admins to update contract addresses.
"""

from flask import Blueprint, jsonify, redirect, render_template, request, session
from settings import Settings
from utils.log import Log
from web3 import Web3
import json


adminPanelContractsBlueprint = Blueprint("adminPanelContracts", __name__)


def _is_admin() -> bool:
    """Return True if the current session belongs to an admin user."""
    return "walletAddress" in session and session.get("userRole") == "admin"


@adminPanelContractsBlueprint.route("/admin/contracts", methods=["GET", "POST"])
def list_or_update_contracts():
    """Render the contract control panel or handle address updates."""
    if not _is_admin():
        Log.error(
            f"{request.remote_addr} tried to reach contracts admin panel without being admin"
        )
        return redirect(f"/login?redirect={request.path}")

    if request.method == "POST" and "contractUpdateButton" in request.form:
        name = request.form.get("contractName")
        address = request.form.get("contractAddress")
        if name in Settings.BLOCKCHAIN_CONTRACTS:
            Log.info(
                f"Admin: {session['walletAddress']} updated address for {name}"
            )
            Settings.BLOCKCHAIN_CONTRACTS[name]["address"] = address
        return redirect("/admin/contracts")

    contracts = {
        name: {
            "address": info.get("address", ""),
            "abi": info.get("abi", []),
        }
        for name, info in Settings.BLOCKCHAIN_CONTRACTS.items()
    }
    return render_template(
        "adminPanelContracts.html",
        contracts=contracts,
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        admin_check=True,
    )


@adminPanelContractsBlueprint.route(
    "/admin/contracts/<string:contract_name>", methods=["GET"]
)
def get_contract(contract_name: str):
    """Return address and ABI for a specific contract."""
    if not _is_admin():
        Log.error(
            f"{request.remote_addr} tried to reach contracts admin panel without being admin"
        )
        return redirect(f"/login?redirect={request.path}")

    info = Settings.BLOCKCHAIN_CONTRACTS.get(contract_name)
    if not info:
        return jsonify({"error": "Unknown contract"}), 404
    return jsonify({"address": info.get("address", ""), "abi": info.get("abi", [])})


@adminPanelContractsBlueprint.route(
    "/admin/contracts/<string:contract_name>/<string:method>", methods=["POST"]
)
def interact(contract_name: str, method: str):
    """Interact with a contract method using call or transact."""
    if not _is_admin():
        Log.error(
            f"{request.remote_addr} tried to reach contracts admin panel without being admin"
        )
        return redirect(f"/login?redirect={request.path}")

    info = Settings.BLOCKCHAIN_CONTRACTS.get(contract_name)
    if not info:
        return jsonify({"error": "Unknown contract"}), 404

    payload = request.get_json(silent=True) or {}
    raw_params = payload.get("params", [])
    params = []
    for p in raw_params:
        if isinstance(p, str):
            try:
                params.append(json.loads(p))
                continue
            except json.JSONDecodeError:
                pass
        params.append(p)
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

