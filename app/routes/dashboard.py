import sqlite3
from json import load

from flask import (
    Blueprint,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from settings import Settings
from utils.delete import Delete
from utils.flashMessage import flashMessage
from utils.log import Log
# Removed paginate_query; dashboard now shows combined activity

dashboardBlueprint = Blueprint("dashboard", __name__)


@dashboardBlueprint.route("/dashboard/<userName>", methods=["GET", "POST"])
def dashboard(userName):
    if "userName" in session:
        if session["userName"].lower() == userName.lower():
            if request.method == "POST":
                if "postDeleteButton" in request.form:
                    Delete.post(request.form["postID"])

                    return (
                        redirect(url_for("dashboard.dashboard", userName=userName)),
                        301,
                    )
            # Fetch all posts for user
            Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")
            p_conn = sqlite3.connect(Settings.DB_POSTS_ROOT)
            p_conn.set_trace_callback(Log.database)
            p_cur = p_conn.cursor()
            p_cur.execute(
                "select * from posts where author = ? order by timeStamp desc",
                (session["userName"],),
            )
            posts = [list(row) for row in p_cur.fetchall()]
            p_conn.close()

            # Fetch all comments for user
            Log.database(f"Connecting to '{Settings.DB_COMMENTS_ROOT}' database")
            c_conn = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
            c_conn.set_trace_callback(Log.database)
            c_cur = c_conn.cursor()
            c_cur.execute(
                """select * from comments where lower(user) = ? and id not in (select commentID from deletedComments) order by timeStamp desc""",
                (userName.lower(),),
            )
            comments = c_cur.fetchall()
            c_conn.close()

            # Translate categories for posts
            language = session.get("language")
            translationFile = f"./translations/{language}.json"
            with open(translationFile, "r", encoding="utf-8") as file:
                translations = load(file)
            for post in posts:
                post[9] = translations["categories"].get(post[9].lower(), post[9])

            # Combine posts and comments into activity list
            activity = []
            for post in posts:
                activity.append({"type": "post", "timestamp": post[7], "data": post})
            for comment in comments:
                activity.append({"type": "comment", "timestamp": comment[4], "data": comment})
            activity.sort(key=lambda x: x["timestamp"], reverse=True)

            return render_template(
                "/dashboard.html",
                activity=activity,
            )
        else:
            Log.error(
                f'User: "{session["userName"]}" tried to login to another users dashboard',
            )

            return redirect(f"/dashboard/{session['userName'].lower()}")
    else:
        Log.error(f"{request.remote_addr} tried to access the dashboard without login")
        flashMessage(
            page="dashboard",
            message="login",
            category="error",
            language=session["language"],
        )

        return redirect("/login?redirect=/dashboard/user")
