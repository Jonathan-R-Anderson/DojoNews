import sqlite3
import queue
import os
from re import sub
from typing import Dict

from flask import (
    Blueprint,
    abort,
    jsonify,
    Response,
    redirect,
    render_template,
    request,
    session,
    stream_with_context,
    url_for,
    send_file,
)
from gtts import gTTS
from settings import Settings
from utils.addPoints import addPoints
from utils.calculateReadTime import calculateReadTime
from utils.delete import Delete
from utils.flashMessage import flashMessage
from utils.forms.CommentForm import CommentForm
from utils.generateUrlIdFromPost import getSlugFromPostTitle
from utils.getDataFromUserIP import getDataFromUserIP
from utils.log import Log
from utils.time import currentTimeStamp
from utils.commentTree import build_comment_tree

postBlueprint = Blueprint("post", __name__)

_comment_queues: Dict[str, queue.Queue] = {}


def _get_comment_queue(url_id: str) -> queue.Queue:
    return _comment_queues.setdefault(url_id, queue.Queue())


@postBlueprint.route("/post/<urlID>", methods=["GET", "POST"])
@postBlueprint.route("/post/<slug>-<urlID>", methods=["GET", "POST"])
def post(urlID=None, slug=None):
    form = CommentForm(request.form)

    Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")

    connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
    connection.set_trace_callback(Log.database)
    cursor = connection.cursor()

    cursor.execute("select urlID, title from posts where urlID = ?", (urlID,))
    posts = cursor.fetchone()

    if str(urlID) in posts:
        postSlug = getSlugFromPostTitle(posts[1])

        if slug != postSlug:
            return redirect(url_for("post.post", urlID=urlID, slug=postSlug))

        Log.success(f'post: "{urlID}" loaded')

        Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")

        connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
        connection.set_trace_callback(Log.database)
        cursor = connection.cursor()

        cursor.execute(
            """select * from posts where urlID = ? """,
            [(urlID)],
        )
        post = cursor.fetchone()

        cursor.execute(
            """update posts set views = views+1 where id = ? """,
            [(post[0])],
        )
        connection.commit()

        if request.method == "POST":
            if "postDeleteButton" in request.form:
                Delete.post(post[0])

                return redirect("/")

            if "commentDeleteButton" in request.form:
                Delete.comment(request.form["commentID"])

                return redirect(url_for("post.post", urlID=urlID)), 301

            from markupsafe import escape

            comment = escape(request.form["comment"])

            Log.database(f"Connecting to '{Settings.DB_COMMENTS_ROOT}' database")

            connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
            connection.set_trace_callback(Log.database)
            cursor = connection.cursor()

            cursor.execute(
                "insert into comments(post,comment,user,timeStamp) \
                values(?, ?, ?, ?)",
                (
                    post[0],
                    comment,
                    session["userName"],
                    currentTimeStamp(),
                ),
            )
            connection.commit()
            _get_comment_queue(urlID).put("update")

            Log.success(
                f'User: "{session["userName"]}" commented to post: "{urlID}"',
            )

            addPoints(5, session["userName"])

            flashMessage(
                page="post",
                message="success",
                category="success",
                language=session["language"],
            )

            return redirect(url_for("post.post", urlID=urlID)), 301

        Log.database(f"Connecting to '{Settings.DB_COMMENTS_ROOT}' database")

        connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
        connection.set_trace_callback(Log.database)
        cursor = connection.cursor()

        sort_option = request.args.get("sort", "new")
        order_by = "timeStamp desc"
        if sort_option == "top":
            order_by = "upvotes desc"

        cursor.execute(
            f"select * from comments where post = ? order by {order_by}",
            (post[0],),
        )
        comments = cursor.fetchall()

        if Settings.ANALYTICS:
            userIPData = getDataFromUserIP(str(request.headers.get("User-Agent")))
            idForRandomVisitor = None
            if "userName" in session:
                sessionUser = session["userName"]
            else:
                sessionUser = "unsignedUser"
            if userIPData["status"] == 0:
                Log.database(f"Connecting to '{Settings.DB_ANALYTICS_ROOT}' database")

                connection = sqlite3.connect(Settings.DB_ANALYTICS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()

                cursor.execute(
                    """insert into postsAnalytics (postID, visitorUserName, country, os, continent, timeStamp) values (?,?,?,?,?,?) RETURNING id""",
                    (
                        post[0],
                        sessionUser,
                        userIPData["payload"]["country"],
                        userIPData["payload"]["os"],
                        userIPData["payload"]["continent"],
                        currentTimeStamp(),
                    ),
                )
                idForRandomVisitor = cursor.fetchone()[0]
                connection.commit()
                connection.close()
            else:
                Log.error(f"Aborting postsAnalytics, {userIPData['message']}")
        else:
            idForRandomVisitor = None

        return render_template(
            "post.html",
            id=post[0],
            title=post[1],
            tags=post[2],
            abstract=post[11],
            content=post[3],
            author=post[5],
            views=post[6],
            downvotes=post[12],
            timeStamp=post[7],
            lastEditTimeStamp=post[8],
            urlID=post[10],
            form=form,
            comments=comments,
            appName=Settings.APP_NAME,
            blogPostUrl=request.root_url,
            readingTime=calculateReadTime(post[3]),
            idForRandomVisitor=idForRandomVisitor,
            sort=sort_option,
        )

    else:
        Log.error(f"{request.remote_addr} tried to reach unknown post")

        return render_template("notFound.html")


@postBlueprint.route("/comment/<int:comment_id>/vote", methods=["POST"])
def vote_comment(comment_id):
    if "userName" not in session:
        return abort(401)

    Log.database(f"Connecting to '{Settings.DB_COMMENTS_ROOT}' database")

    connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
    connection.set_trace_callback(Log.database)
    cursor = connection.cursor()

    cursor.execute(
        "select id from commentVotes where commentID = ? and user = ?",
        (comment_id, session["userName"]),
    )
    if cursor.fetchone():
        cursor.execute(
            "delete from commentVotes where commentID = ? and user = ?",
            (comment_id, session["userName"]),
        )
        cursor.execute(
            "update comments set upvotes = upvotes - 1 where id = ?",
            (comment_id,),
        )
    else:
        cursor.execute(
            "insert into commentVotes(commentID, user) values(?, ?)",
            (comment_id, session["userName"]),
        )
        cursor.execute(
            "update comments set upvotes = upvotes + 1 where id = ?",
            (comment_id,),
        )

    connection.commit()
    connection.close()

    return redirect(request.referrer or "/")


@postBlueprint.route("/post/<urlID>/vote", methods=["POST"])
def vote_post(urlID):
    if "userName" not in session:
        return abort(401)

    Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")

    connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
    connection.set_trace_callback(Log.database)
    cursor = connection.cursor()

    cursor.execute("select id from posts where urlID = ?", (urlID,))
    row = cursor.fetchone()
    if not row:
        connection.close()
        abort(404)
    post_id = row[0]

    cursor.execute(
        "select id from postDownvotes where postID = ? and user = ?",
        (post_id, session["userName"]),
    )
    if cursor.fetchone():
        cursor.execute(
            "delete from postDownvotes where postID = ? and user = ?",
            (post_id, session["userName"]),
        )
        cursor.execute(
            "update posts set downvotes = downvotes - 1 where id = ?",
            (post_id,),
        )
    else:
        cursor.execute(
            "insert into postDownvotes(postID, user) values(?, ?)",
            (post_id, session["userName"]),
        )
        cursor.execute(
            "update posts set downvotes = downvotes + 1 where id = ?",
            (post_id,),
        )

    connection.commit()
    connection.close()

    return redirect(request.referrer or "/")


@postBlueprint.route("/post/<urlID>/audio")
def post_audio(urlID):
    Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")

    connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
    connection.set_trace_callback(Log.database)
    cursor = connection.cursor()
    cursor.execute("select content from posts where urlID = ?", (urlID,))
    row = cursor.fetchone()
    connection.close()
    if not row:
        abort(404)

    text = sub(r"<[^>]+>", "", row[0])
    audio_dir = os.path.join(Settings.APP_ROOT_PATH, "static", "audio")
    os.makedirs(audio_dir, exist_ok=True)
    file_path = os.path.join(audio_dir, f"{urlID}.mp3")
    if not os.path.exists(file_path):
        tts = gTTS(text)
        tts.save(file_path)

    return send_file(file_path, mimetype="audio/mpeg")


@postBlueprint.route("/post/<urlID>/comment-tree")
def comment_tree(urlID):
    Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")

    connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
    connection.set_trace_callback(Log.database)
    cursor = connection.cursor()
    cursor.execute("select id from posts where urlID = ?", (urlID,))
    row = cursor.fetchone()
    connection.close()
    if not row:
        abort(404)
    post_id = row[0]

    Log.database(f"Connecting to '{Settings.DB_COMMENTS_ROOT}' database")

    connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
    connection.set_trace_callback(Log.database)
    cursor = connection.cursor()
    cursor.execute("select * from comments where post = ?", (post_id,))
    comments = cursor.fetchall()
    connection.close()

    tree = build_comment_tree(comments)
    return jsonify(tree)


@postBlueprint.route("/post/<urlID>/comments/stream")
def comment_stream(urlID):
    def gen(q: queue.Queue):
        while True:
            data = q.get()
            yield f"data: {data}\n\n"

    return Response(
        stream_with_context(gen(_get_comment_queue(urlID))),
        mimetype="text/event-stream",
    )
