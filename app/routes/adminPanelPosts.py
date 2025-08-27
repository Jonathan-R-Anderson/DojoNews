from flask import Blueprint, redirect, render_template, request, session
from settings import Settings
from utils.delete import Delete
from utils.log import Log
from utils.paginate import paginate_query

adminPanelPostsBlueprint = Blueprint("adminPanelPosts", __name__)


@adminPanelPostsBlueprint.route("/admin/posts", methods=["GET", "POST"])
@adminPanelPostsBlueprint.route("/adminpanel/posts", methods=["GET", "POST"])
def adminPanelPosts():
    if "walletAddress" in session and session.get("userRole") == "admin":
        Log.info(f"Admin: {session['walletAddress']} reached to posts admin panel")
        Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")

        if request.method == "POST" and "postDeleteButton" in request.form:
            Log.info(
                f"Admin: {session['walletAddress']} deleted post: {request.form['postID']}"
            )
            Delete.post(request.form["postID"])
            return redirect("/admin/posts")

        posts, page, total_pages = paginate_query(
            Settings.DB_POSTS_ROOT,
            "select count(*) from posts",
            "select * from posts order by timeStamp desc",
        )

        Log.info(
            f"Rendering dashboard.html: params: posts={len(posts)} and showPosts=True"
        )

        return render_template(
            "dashboard.html",
            posts=posts,
            showPosts=True,
            page=page,
            total_pages=total_pages,
            admin_check=True,
        )
    Log.error(
        f"{request.remote_addr} tried to reach post admin panel without being admin"
    )
    return redirect("/")

