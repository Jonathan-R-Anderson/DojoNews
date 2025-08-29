import sqlite3
from math import ceil

from flask import Blueprint, redirect, render_template, request, session
from settings import Settings
from utils.log import Log
from web3 import Web3

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

        deleted = set()
        try:
            connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
            connection.set_trace_callback(Log.database)
            cursor = connection.cursor()
            cursor.execute("select commentID from deletedComments")
            deleted = {row[0] for row in cursor.fetchall()}
            connection.close()
        except Exception as exc:  # pragma: no cover - database may be missing
            Log.error(f"Fetching deleted comments failed: {exc}")

        comments = []
        try:  # pragma: no cover - external calls
            w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
            info = Settings.BLOCKCHAIN_CONTRACTS["CommentStorage"]
            contract = w3.eth.contract(address=info["address"], abi=info["abi"])
            next_id = contract.functions.nextCommentId().call()
            for cid in range(next_id):
                data = contract.functions.comments(cid).call()
                author, post_id, content, exists, blacklisted = data
                if not exists or blacklisted or cid in deleted:
                    continue
                comments.append((cid, post_id, content, author, ""))
        except Exception as exc:
            Log.error(f"Fetching comments from blockchain failed: {exc}")

        comments.sort(key=lambda x: x[0])
        page = request.args.get("page", 1, type=int)
        per_page = 9
        total_pages = max(ceil(len(comments) / per_page), 1)
        start = (page - 1) * per_page
        paged = comments[start : start + per_page]

        Log.info(
            f"Rendering adminPanelComments.html: params: comments={len(paged)}"
        )
        return render_template(
            "adminPanelComments.html",
            comments=paged,
            page=page,
            total_pages=total_pages,
            admin_check=True,
        )
    Log.error(
        f"{request.remote_addr} tried to reach comment admin panel without being admin",
    )
    return redirect(f"/login?redirect={request.path}")

