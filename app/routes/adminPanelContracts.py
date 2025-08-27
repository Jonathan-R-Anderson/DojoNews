import json
from flask import Blueprint, redirect, render_template, request, session
from settings import Settings
from utils.log import Log
from web3 import Web3

adminPanelContractsBlueprint = Blueprint("adminPanelContracts", __name__)

@adminPanelContractsBlueprint.route("/admin/contracts", methods=["GET", "POST"])
def adminPanelContracts():
    if "walletAddress" in session and session.get("userRole") == "admin":
        if request.method == "POST":
            if "contractUpdateButton" in request.form:
                name = request.form.get("contractName")
                address = request.form.get("contractAddress")
                if name in Settings.BLOCKCHAIN_CONTRACTS:
                    Log.info(
                        f"Admin: {session['walletAddress']} updated address for {name}"
                    )
                    Settings.BLOCKCHAIN_CONTRACTS[name]["address"] = address
            if "contractCallButton" in request.form:
                name = request.form.get("contractName")
                method = request.form.get("contractMethod")
                args_raw = request.form.get("contractArgs")
                args = json.loads(args_raw) if args_raw else []
                cfg = Settings.BLOCKCHAIN_CONTRACTS.get(name)
                if cfg:
                    try:
                        w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
                        contract = w3.eth.contract(
                            address=cfg["address"], abi=cfg["abi"]
                        )
                        func = getattr(contract.functions, method)(*args)
                        tx = func.build_transaction(
                            {"from": session["walletAddress"], "nonce": 0}
                        )
                        cfg["last_tx"] = tx
                        Log.info(
                            f"Admin: {session['walletAddress']} executed {method} on {name}"
                        )
                    except Exception as exc:
                        Log.error(f"Contract call failed: {exc}")
        Log.info("Rendering adminPanelContracts.html")
        return render_template(
            "adminPanelContracts.html",
            contracts=Settings.BLOCKCHAIN_CONTRACTS,
            admin_check=True,
        )
    Log.error(
        f"{request.remote_addr} tried to reach contracts admin panel without being admin"
    )
    return redirect("/")

