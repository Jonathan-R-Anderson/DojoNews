import sqlite3

from flask import Blueprint, redirect, render_template, request, session
from settings import Settings
from utils.log import Log
from utils.paginate import paginate_query

adminPanelCommentsBlueprint = Blueprint("adminPanelComments", __name__)


@adminPanelCommentsBlueprint.route("/admin/comments", methods=["GET", "POST"])
@adminPanelCommentsBlueprint.route("/adminpanel/comments", methods=["GET", "POST"])
def adminPanelComments():
    if "walletAddress" in session and session.get("userRole") == "admin":
        Log.info(
            f"Admin: {session['walletAddress']} reached to comments admin panel"
        )
        if request.method == "POST":
            comment_id = request.form.get("commentID")
            if "blacklistButton" in request.form and comment_id is not None:
                Log.info(
                    f"Admin: {session['walletAddress']} blacklisted comment: {comment_id}"
                )
                connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()
                cursor.execute(
                    "insert or ignore into deletedComments(commentID) values(?)",
                    (comment_id,),
                )
                connection.commit()
                connection.close()
                return redirect("/admin/comments")

        Log.database(f"Connecting to '{Settings.DB_COMMENTS_ROOT}' database")
        comments, page, total_pages = paginate_query(
            Settings.DB_COMMENTS_ROOT,
            "select count(*) from comments where id not in (select commentID from deletedComments)",
            "select * from comments where id not in (select commentID from deletedComments) order by timeStamp",
        )
        Log.info(
            f"Rendering adminPanelComments.html: params: comments={comments}"
        )
        return render_template(
            "adminPanelComments.html",
            comments=comments,
            page=page,
            total_pages=total_pages,
            admin_check=True,
        )
    Log.error(
        f"{request.remote_addr} tried to reach comment admin panel without being admin",
    )
    return redirect(f"/login?redirect={request.path}")

