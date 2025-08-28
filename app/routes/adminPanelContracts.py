from flask import Blueprint, redirect, render_template, request, session
from settings import Settings
from utils.log import Log

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
        Log.info("Rendering adminPanelContracts.html")
        return render_template(
            "adminPanelContracts.html",
            contracts=Settings.BLOCKCHAIN_CONTRACTS,
            admin_check=True,
        )
    Log.error(
        f"{request.remote_addr} tried to reach contracts admin panel without being admin"
    )
    return redirect(f"/login?redirect={request.path}")

