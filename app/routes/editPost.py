import sqlite3
import math

from flask import Blueprint, redirect, render_template, request, session, flash
from settings import Settings
from utils.flashMessage import flashMessage
from utils.forms.CreatePostForm import CreatePostForm
from utils.log import Log
from utils.time import currentTimeStamp
from utils.categories import get_categories, DEFAULT_CATEGORIES
from blockchain import BlockchainConfig, set_image_magnet

editPostBlueprint = Blueprint("editPost", __name__)


@editPostBlueprint.route("/editpost/<urlID>", methods=["GET", "POST"])
def editPost(urlID):
    """
    This function handles the edit post route.

    Args:
        postID (string): the ID of the post to edit

    Returns:
        The rendered edit post template or a redirect to the homepage if the user is not authorized to edit the post

    Raises:
        abort(404): if the post does not exist
        abort(401): if the user is not authorized to edit the post
    """

    if "userName" in session:
        Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")

        connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
        connection.set_trace_callback(Log.database)
        cursor = connection.cursor()
        cursor.execute("select urlID from posts where urlID = ?", (urlID,))
        posts = str(cursor.fetchall())

        if str(urlID) in posts:
            Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")

            connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
            connection.set_trace_callback(Log.database)
            cursor = connection.cursor()
            cursor.execute(
                """select * from posts where urlID = ? """,
                [(urlID)],
            )
            post = cursor.fetchone()

            Log.success(f'POST: "{urlID}" FOUND')

            if post[5] == session["userName"] or session["userRole"] == "admin":
                categories = get_categories()
                form = CreatePostForm(request.form)
                form.postCategory.choices = [(c, c) for c in categories]
                form.postTitle.data = post[1]
                form.postTags.data = post[2]
                form.postAbstract.data = post[11]
                form.postContent.data = post[3]
                form.postCategory.data = post[9]

                if request.method == "POST":
                    postTitle = request.form["postTitle"]
                    postTags = request.form["postTags"]
                    postContent = request.form["postContent"]
                    postAbstract = request.form["postAbstract"]
                    selectedCategory = request.form.get("postCategory", "").strip()
                    newCategory = request.form.get("newCategory", "").strip()
                    postBanner = request.files["postBanner"].read()
                    bannerMagnet = request.form.get("postBannerMagnet", "")

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
                        return redirect(f"/editpost/{urlID}")

                    categories_lower = [c.lower() for c in categories]
                    default_lower = [c.lower() for c in DEFAULT_CATEGORIES]

                    if category_candidate.lower() not in categories_lower:
                        if not is_high:
                            flash("You are not allowed to create a new category.", "error")
                            return redirect(f"/editpost/{urlID}")
                    elif category_candidate.lower() not in default_lower:
                        if not (is_low or is_high):
                            flash("You are not allowed to use this category.", "error")
                            return redirect(f"/editpost/{urlID}")

                    postCategory = category_candidate

                    if postContent == "" or postAbstract == "":
                        flashMessage(
                            page="editPost",
                            message="empty",
                            category="error",
                            language=session["language"],
                        )
                        Log.error(
                            f'User: "{session["userName"]}" tried to edit a post with empty content',
                        )
                    else:
                        connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
                        connection.set_trace_callback(Log.database)
                        cursor = connection.cursor()
                        cursor.execute(
                            """update posts set title = ? where id = ? """,
                            (postTitle, post[0]),
                        )
                        cursor.execute(
                            """update posts set tags = ? where id = ? """,
                            (postTags, post[0]),
                        )
                        cursor.execute(
                            """update posts set content = ? where id = ? """,
                            (postContent, post[0]),
                        )
                        cursor.execute(
                            """update posts set abstract = ? where id = ? """,
                            (postAbstract, post[0]),
                        )
                        cursor.execute(
                            """update posts set category = ? where id = ? """,
                            (postCategory, post[0]),
                        )
                        if postBanner != b"":
                            cursor.execute(
                                """update posts set banner = ? where id = ? """,
                                (postBanner, post[0]),
                            )
                            if bannerMagnet:
                                contract = Settings.BLOCKCHAIN_CONTRACTS["ImageStorage"]
                                cfg = BlockchainConfig(
                                    rpc_url=Settings.BLOCKCHAIN_RPC_URL,
                                    contract_address=contract["address"],
                                    abi=contract["abi"],
                                )
                                try:
                                    set_image_magnet(cfg, f"{post[0]}.png", bannerMagnet)
                                except Exception as e:
                                    Log.error(
                                        f"Failed to store magnet for post {post[0]}: {e}"
                                    )
                        cursor.execute(
                            """update posts set lastEditTimeStamp = ? where id = ? """,
                            [(currentTimeStamp()), (post[0])],
                        )

                        connection.commit()
                        Log.success(f'Post: "{postTitle}" edited')
                        flashMessage(
                            page="editPost",
                            message="success",
                            category="success",
                            language=session["language"],
                        )
                        return redirect(f"/post/{post[10]}")

                return render_template(
                    "/editPost.html",
                    id=post[0],
                    title=post[1],
                    tags=post[2],
                    content=post[3],
                    form=form,
                    categories=categories,
                )
            else:
                flashMessage(
                    page="editPost",
                    message="author",
                    category="error",
                    language=session["language"],
                )
                Log.error(
                    f'User: "{session["userName"]}" tried to edit another authors post',
                )
                return redirect("/")
        else:
            Log.error(f'Post: "{urlID}" not found')
            return render_template("notFound.html")
    else:
        Log.error(f"{request.remote_addr} tried to edit post without login")
        flashMessage(
            page="editPost",
            message="login",
            category="error",
            language=session["language"],
        )
        return redirect(f"/login?redirect=/editpost/{urlID}")
