from flask import Blueprint, abort, redirect, render_template, request, session, jsonify
from eth_account.messages import encode_defunct
from web3 import Web3
from settings import Settings
from utils.log import Log

loginBlueprint = Blueprint("login", __name__)

LOGIN_MESSAGE = "Log in to FlaskBlog"


@loginBlueprint.route("/login/redirect=<direct>", methods=["GET", "POST"])
def login(direct):
    """Handle MetaMask based login."""
    direct = direct.replace("&", "/")
    if not Settings.LOG_IN:
        return redirect(direct), 301
    if "walletAddress" in session:
        Log.error(f'Wallet: "{session["walletAddress"]}" already logged in')
        return redirect(direct), 301
    if request.method == "POST":
        data = request.get_json()
        if not data:
            abort(400)
        address = data.get("address")
        signature = data.get("signature")
        if not address or not signature:
            abort(400)
        message = encode_defunct(text=LOGIN_MESSAGE)
        recovered = Web3().eth.account.recover_message(message, signature=signature)
        if recovered.lower() != address.lower():
            abort(401)
        session["walletAddress"] = recovered
        session["userRole"] = (
            "admin"
            if recovered.lower() == Settings.ADMIN_WALLET_ADDRESS.lower()
            else "user"
        )
        session["userName"] = recovered
        Log.success(f'Wallet: "{recovered}" logged in')
        return jsonify({"redirect": direct})
    return render_template("login.html", hideLogin=True, direct=direct)

