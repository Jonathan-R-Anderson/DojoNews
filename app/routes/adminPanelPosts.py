import sqlite3

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

        if request.method == "POST":
            post_id = request.form.get("postID")
            if "postDeleteButton" in request.form:
                Log.info(
                    f"Admin: {session['walletAddress']} deleted post: {post_id}"
                )
                Delete.post(post_id)
                return redirect("/admin/posts")
            if "blacklistButton" in request.form:
                Log.info(
                    f"Admin: {session['walletAddress']} blacklisted post: {post_id}"
                )
                connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()
                cursor.execute(
                    "select urlID from posts where id = ?", (post_id,)
                )
                row = cursor.fetchone()
                if row:
                    cursor.execute(
                        "insert or ignore into deletedPosts(urlID) values(?)",
                        (row[0],),
                    )
                    connection.commit()
                connection.close()
                return redirect("/admin/posts")

        posts, page, total_pages = paginate_query(
            Settings.DB_POSTS_ROOT,
            "select count(*) from posts",
            "select * from posts order by timeStamp desc",
        )

        Log.info(
            f"Rendering adminPanelPosts.html: params: posts={len(posts)}"
        )

        return render_template(
            "adminPanelPosts.html",
            posts=posts,
            page=page,
            total_pages=total_pages,
            admin_check=True,
        )
    Log.error(
        f"{request.remote_addr} tried to reach post admin panel without being admin"
    )
    return redirect(f"/login?redirect={request.path}")

