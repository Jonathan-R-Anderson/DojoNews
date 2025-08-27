import os
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
from utils.calculateReadTime import calculateReadTime
from utils.generateUrlIdFromPost import getSlugFromPostTitle
from utils.log import Log
from blockchain import BlockchainConfig, get_post

postBlueprint = Blueprint("post", __name__)


@postBlueprint.route("/post/<int:urlID>", methods=["GET"])
@postBlueprint.route("/post/<slug>-<int:urlID>", methods=["GET"])
def post(urlID: int, slug: str | None = None):
    contract = Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]
    cfg = BlockchainConfig(
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        contract_address=contract["address"],
        abi=contract["abi"],
    )
    try:
        data = get_post(cfg, urlID)
    except Exception as e:
        Log.error(f"Failed to load post {urlID}: {e}")
        return render_template("notFound.html")

    try:
        title, tags, abstract, content, category, banner_magnet = data["content"].split("|", 5)
    except ValueError:
        Log.error(f"Malformed post payload for {urlID}")
        return render_template("notFound.html")

    postSlug = getSlugFromPostTitle(title)
    if slug != postSlug:
        return redirect(url_for("post.post", urlID=urlID, slug=postSlug))

    return render_template(
        "post.html",
        id=urlID,
        title=title,
        tags=tags,
        abstract=abstract,
        content=content,
        author=data["author"],
        views=0,
        downvotes=0,
        timeStamp="",
        lastEditTimeStamp="",
        urlID=urlID,
        comments=[],
        appName=Settings.APP_NAME,
        blogPostUrl=request.root_url,
        readingTime=calculateReadTime(content),
        idForRandomVisitor=None,
        sort="new",
        banner_magnet=banner_magnet,
    )


@postBlueprint.route("/post/<int:urlID>/audio")
def post_audio(urlID: int):
    contract = Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]
    cfg = BlockchainConfig(
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        contract_address=contract["address"],
        abi=contract["abi"],
    )
    try:
        data = get_post(cfg, urlID)
    except Exception:
        abort(404)

    parts = data["content"].split("|", 5)
    text = sub(r"<[^>]+>", "", parts[3] if len(parts) > 3 else "")
    audio_dir = os.path.join(Settings.APP_ROOT_PATH, "static", "audio")
    os.makedirs(audio_dir, exist_ok=True)
    file_path = os.path.join(audio_dir, f"{urlID}.mp3")
    if not os.path.exists(file_path):
        tts = gTTS(text)
        tts.save(file_path)
    return send_file(file_path, mimetype="audio/mpeg")
