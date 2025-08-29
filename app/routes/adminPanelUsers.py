"""Admin panel for listing authors from on-chain and DB content."""

import sqlite3
from collections import defaultdict

from flask import Blueprint, redirect, render_template, request, session
from settings import Settings
from utils.blacklist import Blacklist
from utils.delete import Delete
from utils.log import Log
from web3 import Web3

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

        # Collect post and comment counts per author from databases and contracts
        authors = defaultdict(lambda: {"posts": 0, "comments": 0})

        # Gather authors from database tables
        try:
            Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")
            connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
            connection.set_trace_callback(Log.database)
            cursor = connection.cursor()
            cursor.execute("select author from posts")
            for (addr,) in cursor.fetchall():
                authors[addr]["posts"] += 1
            connection.close()
        except Exception as exc:  # pragma: no cover - database may be missing
            Log.error(f"Fetching post authors failed: {exc}")

        try:
            Log.database(f"Connecting to '{Settings.DB_COMMENTS_ROOT}' database")
            connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
            connection.set_trace_callback(Log.database)
            cursor = connection.cursor()
            cursor.execute("select user from comments")
            for (addr,) in cursor.fetchall():
                authors[addr]["comments"] += 1
            connection.close()
        except Exception as exc:  # pragma: no cover - database may be missing
            Log.error(f"Fetching comment authors failed: {exc}")

        # Gather authors from blockchain contracts
        try:  # pragma: no cover - external calls
            w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
            post_info = Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]
            post_contract = w3.eth.contract(
                address=post_info["address"], abi=post_info["abi"]
            )
            next_post_id = post_contract.functions.nextPostId().call()
            for pid in range(next_post_id):
                data = post_contract.functions.posts(pid).call()
                if data[4]:  # exists
                    addr = data[0]
                    authors[addr]["posts"] += 1

            comment_info = Settings.BLOCKCHAIN_CONTRACTS["CommentStorage"]
            comment_contract = w3.eth.contract(
                address=comment_info["address"], abi=comment_info["abi"]
            )
            next_comment_id = comment_contract.functions.nextCommentId().call()
            for cid in range(next_comment_id):
                data = comment_contract.functions.comments(cid).call()
                if data[3]:  # exists
                    addr = data[0]
                    authors[addr]["comments"] += 1
        except Exception as exc:  # pragma: no cover - external calls
            Log.error(f"Fetching authors from blockchain failed: {exc}")

        author_data = [
            {"address": addr, "posts": info["posts"], "comments": info["comments"]}
            for addr, info in sorted(authors.items())
        ]

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
