import sqlite3

from flask import (
    Blueprint,
    redirect,
    render_template,
    request,
    session,
)
from settings import Settings
from utils.log import Log

adminPanelContractsBlueprint = Blueprint("adminPanelContracts", __name__)


@adminPanelContractsBlueprint.route("/admin/contracts", methods=["GET", "POST"])
def adminPanelContracts():
    if "userName" in session:
        Log.info(f"Admin: {session['userName']} reached contracts admin panel")
        Log.database(f"Connecting to '{Settings.DB_USERS_ROOT}' database")
        connection = sqlite3.connect(Settings.DB_USERS_ROOT)
        connection.set_trace_callback(Log.database)
        cursor = connection.cursor()
        cursor.execute(
            """select role from users where userName = ? """,
            [(session["userName"])],
        )
        role = cursor.fetchone()[0]
        if role == "admin":
            if request.method == "POST" and "contractUpdateButton" in request.form:
                name = request.form.get("contractName")
                address = request.form.get("contractAddress")
                if name in Settings.BLOCKCHAIN_CONTRACTS:
                    Log.info(
                        f"Admin: {session['userName']} updated address for {name}"
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
        return redirect("/")
    Log.error(
        f"{request.remote_addr} tried to reach contracts admin panel being logged in"
    )
    return redirect("/")
