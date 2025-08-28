from flask import Blueprint, redirect, render_template, request, session
from utils.log import Log

adminPanelBlueprint = Blueprint("adminPanel", __name__)

@adminPanelBlueprint.route("/admin")
def adminPanel():
    if "walletAddress" in session and session.get("userRole") == "admin":
        Log.info(f"Admin: {session['walletAddress']} reached to the admin panel")
        Log.info("Rendering adminPanel.html: params: None")
        return render_template("adminPanel.html", admin_check=True)
    Log.error(f"{request.remote_addr} tried to reach admin panel without being admin")
    return redirect(f"/login?redirect={request.path}")

