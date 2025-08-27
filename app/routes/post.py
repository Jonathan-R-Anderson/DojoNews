import os
import sqlite3
from re import sub

from flask import (
    Blueprint,
    abort,
    redirect,
    render_template,
    request,
    url_for,
    send_file,
)
from gtts import gTTS
from settings import Settings
from utils.generateUrlIdFromPost import getSlugFromPostTitle
from utils.log import Log

postBlueprint = Blueprint("post", __name__)


@postBlueprint.route("/post/<int:urlID>", methods=["GET"])
@postBlueprint.route("/post/<slug>-<int:urlID>", methods=["GET"])
def post(urlID: int, slug: str | None = None):
    Log.database(f"Connecting to '{Settings.DB_POSTS_ROOT}' database")
    connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
    connection.set_trace_callback(Log.database)
    cursor = connection.cursor()
    cursor.execute(
        "SELECT title, tags, author, abstract FROM posts WHERE urlID = ?",
        (urlID,),
    )
    post = cursor.fetchone()
    connection.close()

    if not post:
        Log.error(f'Post: "{urlID}" not found')
        return render_template("notFound.html")

    title, tags, author, abstract = post

    postSlug = getSlugFromPostTitle(title)
    if slug != postSlug:
        return redirect(url_for("post.post", urlID=urlID, slug=postSlug))

    return render_template(
        "post.html",
        id=urlID,
        title=title,
        tags=tags,
        abstract=abstract,
        author=author,
        views=0,
        downvotes=0,
        timeStamp="",
        lastEditTimeStamp="",
        urlID=urlID,
        comments=[],
        appName=Settings.APP_NAME,
        blogPostUrl=request.root_url,
        idForRandomVisitor=None,
        sort="new",
        banner_magnet="",
    )


@postBlueprint.route("/post/<int:urlID>/audio")
def post_audio(urlID: int):
    connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
    connection.set_trace_callback(Log.database)
    cursor = connection.cursor()
    cursor.execute("SELECT content FROM posts WHERE urlID = ?", (urlID,))
    row = cursor.fetchone()
    connection.close()
    if not row:
        abort(404)

    parts = row[0].split("|", 5)
    text = sub(r"<[^>]+>", "", parts[3] if len(parts) > 3 else "")
    audio_dir = os.path.join(Settings.APP_ROOT_PATH, "static", "audio")
    os.makedirs(audio_dir, exist_ok=True)
    file_path = os.path.join(audio_dir, f"{urlID}.mp3")
    if not os.path.exists(file_path):
        tts = gTTS(text)
        tts.save(file_path)
    return send_file(file_path, mimetype="audio/mpeg")
