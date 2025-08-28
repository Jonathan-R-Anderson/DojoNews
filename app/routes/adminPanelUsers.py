"""Admin panel for listing authors from posts and comments."""

import sqlite3
from flask import Blueprint, redirect, render_template, request, session
from settings import Settings
from utils.blacklist import Blacklist
from utils.delete import Delete
from utils.log import Log

adminPanelUsersBlueprint = Blueprint("adminPanelUsers", __name__)


@adminPanelUsersBlueprint.route("/admin/users", methods=["GET", "POST"])
@adminPanelUsersBlueprint.route("/adminpanel/users", methods=["GET", "POST"])
def adminPanelUsers():
    """Render the admin users panel with unique author addresses."""
    if "walletAddress" in session and session.get("userRole") == "admin":
        Log.info(f"Admin: {session['walletAddress']} reached to users admin panel")
        if request.method == "POST":
            address = request.form.get("address")
            if "banButton" in request.form:
                Log.info(
                    f"Admin: {session['walletAddress']} banned user: {address}"
                )
                Delete.user(address)
                return redirect("/admin/users")
            if "blacklistButton" in request.form:
                Log.info(
                    f"Admin: {session['walletAddress']} blacklisted content of: {address}"
                )
                Blacklist.add_user_content(address)
                return redirect("/admin/users")

        authors = set()
        try:
            Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")
            connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
            connection.set_trace_callback(Log.database)
            cursor = connection.cursor()
            cursor.execute("select distinct author from posts")
            authors.update(row[0] for row in cursor.fetchall())
            connection.close()
        except Exception as exc:  # pragma: no cover - database may be missing
            Log.error(f"Fetching post authors failed: {exc}")

        try:
            Log.database(f"Connecting to '{Settings.DB_COMMENTS_ROOT}' database")
            connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
            connection.set_trace_callback(Log.database)
            cursor = connection.cursor()
            cursor.execute("select distinct user from comments")
            authors.update(row[0] for row in cursor.fetchall())
            connection.close()
        except Exception as exc:  # pragma: no cover - database may be missing
            Log.error(f"Fetching comment authors failed: {exc}")

        author_data = []
        for addr in sorted(authors):
            posts_count = 0
            comments_count = 0
            try:
                connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()
                cursor.execute("select count(*) from posts where author = ?", (addr,))
                posts_count = cursor.fetchone()[0]
                connection.close()
            except Exception as exc:  # pragma: no cover
                Log.error(f"Counting posts failed: {exc}")
            try:
                connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()
                cursor.execute(
                    "select count(*) from comments where user = ?", (addr,)
                )
                comments_count = cursor.fetchone()[0]
                connection.close()
            except Exception as exc:  # pragma: no cover
                Log.error(f"Counting comments failed: {exc}")
            author_data.append(
                {"address": addr, "posts": posts_count, "comments": comments_count}
            )

        Log.info(
            f"Rendering adminPanelUsers.html: params: authors={len(author_data)}"
        )
        return render_template(
            "adminPanelUsers.html",
            authors=author_data,
            admin_check=True,
        )
    Log.error(
        f"{request.remote_addr} tried to reach user admin panel without being admin"
    )
    return redirect(f"/login?redirect={request.path}")
