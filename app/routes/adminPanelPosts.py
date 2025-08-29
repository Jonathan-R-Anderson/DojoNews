"""Admin panel for listing and blacklisting posts."""

import sqlite3
from math import ceil

from flask import Blueprint, redirect, render_template, request, session
from settings import Settings
from utils.log import Log
from web3 import Web3

adminPanelPostsBlueprint = Blueprint("adminPanelPosts", __name__)


@adminPanelPostsBlueprint.route("/admin/posts", methods=["GET", "POST"])
@adminPanelPostsBlueprint.route("/adminpanel/posts", methods=["GET", "POST"])
def adminPanelPosts():
    if "walletAddress" in session and session.get("userRole") == "admin":
        Log.info(f"Admin: {session['walletAddress']} reached to posts admin panel")

        # Handle blacklist requests
        if request.method == "POST":
            post_id = request.form.get("postID")
            if "blacklistButton" in request.form and post_id is not None:
                Log.info(
                    f"Admin: {session['walletAddress']} blacklisted post: {post_id}"
                )
                connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()
                cursor.execute(
                    "insert or ignore into deletedPosts(urlID) values(?)",
                    (post_id,),
                )
                connection.commit()
                connection.close()
                return redirect("/admin/posts")

        # Fetch existing blacklisted post IDs
        deleted = set()
        try:
            connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
            connection.set_trace_callback(Log.database)
            cursor = connection.cursor()
            cursor.execute("select urlID from deletedPosts")
            deleted = {row[0] for row in cursor.fetchall()}
            connection.close()
        except Exception as exc:  # pragma: no cover - database may be missing
            Log.error(f"Fetching deleted posts failed: {exc}")

        # Gather posts from blockchain
        posts = []
        try:  # pragma: no cover - external calls
            w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
            contract_info = Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]
            contract = w3.eth.contract(
                address=contract_info["address"], abi=contract_info["abi"]
            )
            next_id = contract.functions.nextPostId().call()
            for pid in range(next_id - 1, -1, -1):
                data = contract.functions.posts(pid).call()
                author = data[0]
                content_hash = data[1]
                exists = data[4]
                blacklisted = data[5]
                banner_id = data[7]
                if not exists or blacklisted or str(pid) in deleted:
                    continue
                title = content_hash.split("|", 1)[0] if content_hash else ""
                posts.append(
                    {
                        "id": pid,
                        "title": title,
                        "author": author,
                        "banner": banner_id,
                    }
                )
        except Exception as exc:  # pragma: no cover - network errors
            Log.error(f"Fetching posts from blockchain failed: {exc}")

        # Paginate posts
        page = request.args.get("page", 1, type=int)
        per_page = 9
        total_pages = max(ceil(len(posts) / per_page), 1)
        start = (page - 1) * per_page
        posts = posts[start : start + per_page]

        Log.info(
            f"Rendering adminPanelPosts.html: params: posts={len(posts)}"
        )

        post_contract = Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]
        return render_template(
            "adminPanelPosts.html",
            posts=posts,
            page=page,
            total_pages=total_pages,
            admin_check=True,
            post_contract_address=post_contract["address"],
            post_contract_abi=post_contract["abi"],
            rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        )
    Log.error(
        f"{request.remote_addr} tried to reach post admin panel without being admin"
    )
    return redirect(f"/login?redirect={request.path}")

