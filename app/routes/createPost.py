import sqlite3
import math

from flask import Blueprint, redirect, render_template, request, session, flash
from settings import Settings
from utils.addPoints import addPoints
from utils.flashMessage import flashMessage
from utils.forms.CreatePostForm import CreatePostForm
from utils.generateUrlIdFromPost import generateurlID
from utils.log import Log
from utils.time import currentTimeStamp
from utils.categories import get_categories, DEFAULT_CATEGORIES
from blockchain import BlockchainConfig, set_image_magnet

createPostBlueprint = Blueprint("createPost", __name__)


@createPostBlueprint.route("/createpost", methods=["GET", "POST"])
def createPost():
    """
    This function creates a new post for the user.

    Args:
        request (Request): The request object from the user.

    Returns:
        Response: The response object with the HTML template for the create post page.

    Raises:
        401: If the user is not authenticated.
    """

    if "userName" in session:
        categories = get_categories()
        form = CreatePostForm(request.form)
        form.postCategory.choices = [(c, c) for c in categories]

        if request.method == "POST":
            postTitle = request.form["postTitle"]
            postTags = request.form["postTags"]
            postAbstract = request.form["postAbstract"]
            postContent = request.form["postContent"]
            postBanner = request.files["postBanner"].read()
            bannerMagnet = request.form.get("postBannerMagnet", "")
            selectedCategory = request.form.get("postCategory", "").strip()
            newCategory = request.form.get("newCategory", "").strip()

            # Determine user posting statistics
            connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
            cursor = connection.cursor()
            cursor.execute("SELECT author, COUNT(*) FROM posts GROUP BY author")
            rows = cursor.fetchall()
            connection.close()

            user_count = 0
            other_counts = []
            for author, count in rows:
                if author == session["userName"]:
                    user_count = count
                else:
                    other_counts.append(count)
            if other_counts:
                mean = sum(other_counts) / len(other_counts)
                variance = sum((c - mean) ** 2 for c in other_counts) / len(other_counts)
                stddev = math.sqrt(variance)
            else:
                mean = 0
                stddev = 0

            is_high = user_count > mean + stddev
            is_low = user_count <= mean - stddev

            category_candidate = newCategory if newCategory else selectedCategory

            if not category_candidate:
                flash("Category is required.", "error")
                return redirect("/createpost")

            categories_lower = [c.lower() for c in categories]
            default_lower = [c.lower() for c in DEFAULT_CATEGORIES]

            if category_candidate.lower() not in categories_lower:
                if not is_high:
                    flash("You are not allowed to create a new category.", "error")
                    return redirect("/createpost")
            elif category_candidate.lower() not in default_lower:
                if not (is_low or is_high):
                    flash("You are not allowed to use this category.", "error")
                    return redirect("/createpost")

            postCategory = category_candidate

            if postContent == "" or postAbstract == "":
                flashMessage(
                    page="createPost",
                    message="empty",
                    category="error",
                    language=session["language"],
                )
                Log.error(
                    f'User: "{session["userName"]}" tried to create a post with empty content',
                )
            else:
                Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")
                connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()
                cursor.execute(
                    """
                    INSERT INTO posts (
                        title,
                        tags,
                        content,
                        banner,
                        author,
                        views,
                        timeStamp,
                        lastEditTimeStamp,
                        category,
                        urlID,
                        abstract
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )
                    """,
                    (
                        postTitle,
                        postTags,
                        postContent,
                        postBanner,
                        session["userName"],
                        0,
                        currentTimeStamp(),
                        currentTimeStamp(),
                        postCategory,
                        generateurlID(),
                        postAbstract,
                    ),
                )
                post_id = cursor.lastrowid
                connection.commit()
                Log.success(
                    f'Post: "{postTitle}" posted by "{session["userName"]}"',
                )

                if bannerMagnet:
                    contract = Settings.BLOCKCHAIN_CONTRACTS["ImageStorage"]
                    cfg = BlockchainConfig(
                        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
                        contract_address=contract["address"],
                        abi=contract["abi"],
                    )
                    try:
                        set_image_magnet(cfg, f"{post_id}.png", bannerMagnet)
                    except Exception as e:
                        Log.error(
                            f"Failed to store magnet for post {post_id}: {e}"
                        )

                addPoints(20, session["userName"])
                flashMessage(
                    page="createPost",
                    message="success",
                    category="success",
                    language=session["language"],
                )
                return redirect("/")

        return render_template(
            "createPost.html",
            form=form,
            categories=categories,
        )
    else:
        Log.error(f"{request.remote_addr} tried to create a new post without login")
        flashMessage(
            page="createPost",
            message="login",
            category="error",
            language=session["language"],
        )
        return redirect("/login/redirect=&createpost")
