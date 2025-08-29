import sqlite3
from datetime import datetime

from flask import Blueprint, render_template, request, session
from settings import Settings
from utils.log import Log

adminPanelActivityBlueprint = Blueprint("adminPanelActivity", __name__)


@adminPanelActivityBlueprint.route("/admin/activity")
def adminPanelActivity():
    if "walletAddress" in session and session.get("userRole") == "admin":
        Log.info(f"Admin: {session['walletAddress']} reached to activity admin panel")
        with sqlite3.connect(Settings.DB_ANALYTICS_ROOT) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                """
                SELECT ip, country, path, method, userName, timeStamp
                FROM userActivity
                ORDER BY timeStamp DESC
                LIMIT 100
                """
            ).fetchall()
        activities = [
            {
                "ip": r["ip"],
                "country": r["country"],
                "path": r["path"],
                "method": r["method"],
                "userName": r["userName"],
                "time": datetime.utcfromtimestamp(r["timeStamp"]).strftime("%Y-%m-%d %H:%M:%S"),
            }
            for r in rows
        ]
        return render_template(
            "adminPanelActivity.html", activities=activities, admin_check=True
        )
    Log.error(
        f"{request.remote_addr} tried to reach activity admin panel without being admin"
    )
    return render_template("notFound.html")
