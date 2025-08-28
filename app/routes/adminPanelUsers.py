from flask import Blueprint, redirect, render_template, request, session
from settings import Settings
from utils.changeUserRole import changeUserRole
from utils.delete import Delete
from utils.log import Log
from utils.paginate import paginate_query

adminPanelUsersBlueprint = Blueprint("adminPanelUsers", __name__)


@adminPanelUsersBlueprint.route("/admin/users", methods=["GET", "POST"])
@adminPanelUsersBlueprint.route("/adminpanel/users", methods=["GET", "POST"])
def adminPanelUsers():
    if "walletAddress" in session and session.get("userRole") == "admin":
        Log.info(f"Admin: {session['walletAddress']} reached to users admin panel")
        if request.method == "POST":
            if "userDeleteButton" in request.form:
                Log.info(
                    f"Admin: {session['walletAddress']} deleted user: {request.form['userName']}"
                )
                Delete.user(request.form["userName"])
            if "userRoleChangeButton" in request.form:
                Log.info(
                    f"Admin: {session['walletAddress']} changed {request.form['userName']}'s role"
                )
                changeUserRole(request.form["userName"])

        users, page, total_pages = paginate_query(
            Settings.DB_USERS_ROOT,
            "select count(*) from users",
            "select * from users",
        )

        Log.info(f"Rendering adminPanelUsers.html: params: users={users}")

        return render_template(
            "adminPanelUsers.html",
            users=users,
            page=page,
            total_pages=total_pages,
            admin_check=True,
        )
    Log.error(
        f"{request.remote_addr} tried to reach user admin panel without being admin"
    )
    return redirect(f"/login?redirect={request.path}")

