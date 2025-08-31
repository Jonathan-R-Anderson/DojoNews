import os
from math import ceil
from re import sub
import re
import sqlite3
from datetime import datetime

from flask import (
    Blueprint,
    abort,
    jsonify,
    redirect,
    render_template,
    request,
    url_for,
    send_file,
)
from gtts import gTTS
from settings import Settings
from utils.generateUrlIdFromPost import getSlugFromPostTitle
from utils.commentTree import build_comment_tree
from utils.log import Log
from web3 import Web3

postBlueprint = Blueprint("post", __name__)


def _get_onchain_post(urlID: int):
    """Retrieve post data from the blockchain."""

    contract_info = Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]
    w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
    contract = w3.eth.contract(
        address=contract_info["address"], abi=contract_info["abi"]
    )
    try:
        return contract.functions.getPost(urlID).call()
    except Exception as exc:  # pragma: no cover - network errors
        Log.error(f"Post: '{urlID}' not found on chain: {exc}")
        return None


@postBlueprint.route("/post/<int:urlID>", methods=["GET"])
@postBlueprint.route("/post/<slug>-<int:urlID>", methods=["GET"])
@postBlueprint.route("/board/<int:urlID>", methods=["GET"])
@postBlueprint.route("/board/<slug>-<int:urlID>", methods=["GET"])
def post(urlID: int, slug: str | None = None):
    with sqlite3.connect(Settings.DB_POSTS_ROOT) as connection:
        connection.set_trace_callback(Log.database)
        cursor = connection.cursor()
        cursor.execute(
            "select 1 from deletedPosts where urlID = ?",
            (str(urlID),),
        )
        if cursor.fetchone():
            return render_template("notFound.html")

    onchain = _get_onchain_post(urlID)
    if not onchain:
        return render_template("notFound.html")

    # onchain tuple: (author, contentHash, magnetURI, authorInfo, exists, blacklisted, imageIds, bannerImageId, videoIds)
    content_hash = onchain[1]
    parts = content_hash.split("|", 5)
    title = parts[0] if len(parts) > 0 else ""
    tags = parts[1] if len(parts) > 1 else ""
    abstract = parts[2] if len(parts) > 2 else ""
    content = parts[3] if len(parts) > 3 else ""
    category = parts[4] if len(parts) > 4 else ""
    author = onchain[0]
    author_info = onchain[3]
    video_ids = onchain[8] if len(onchain) > 8 else []

    postSlug = getSlugFromPostTitle(title) if title else slug
    if title and slug != postSlug:
        return redirect(f"/board/{postSlug}-{urlID}")

    def apply_filters(text: str) -> str:
        for bad, good in Settings.BOARD_WORD_FILTERS.items():
            text = re.sub(bad, good, text, flags=re.IGNORECASE)
        return text

    title = apply_filters(title)
    tags = apply_filters(tags)
    abstract = apply_filters(abstract)
    content = apply_filters(content)

    clean_text = sub(r"<[^>]+>", "", content)
    reading_time = max(1, ceil(len(clean_text.split()) / 200))

    timestamp = 0
    try:
        contract_info = Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]
        w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
        contract = w3.eth.contract(address=contract_info["address"], abi=contract_info["abi"])
        events = contract.events.PostCreated.create_filter(
            fromBlock=0, argument_filters={"postId": urlID}
        ).get_all_entries()
        if events:
            block = w3.eth.get_block(events[0]["blockNumber"])
            timestamp = block.get("timestamp", 0)
    except Exception as exc:  # pragma: no cover - network errors
        Log.error(f"Failed to fetch timestamp for {urlID}: {exc}")

    if Settings.ANALYTICS:
        try:
            with sqlite3.connect(Settings.DB_ANALYTICS_ROOT) as conn:
                conn.execute(
                    "INSERT OR IGNORE INTO postStats(postID) VALUES (?)",
                    (urlID,),
                )
                conn.execute(
                    "UPDATE postStats SET estimatedReadTime=? WHERE postID=?",
                    (reading_time, urlID),
                )
                conn.commit()
        except Exception as exc:  # pragma: no cover - analytics DB may be missing
            Log.error(f"Failed to update postStats for {urlID}: {exc}")

    with sqlite3.connect(Settings.DB_COMMENTS_ROOT) as connection:
        connection.set_trace_callback(Log.database)
        cursor = connection.cursor()
        cursor.execute("select commentID from deletedComments")
        deleted_comments = [row[0] for row in cursor.fetchall()]

    return render_template(
        "post.html",
        id=urlID,
        title=title,
        tags=tags,
        abstract=abstract,
        author=author,
        views=0,
        downvotes=0,
        timeStamp=datetime.utcfromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M") if timestamp else "",
        lastEditTimeStamp="",
        urlID=urlID,
        comments=[],
        appName=Settings.APP_NAME,
        blogPostUrl=request.root_url,
        idForRandomVisitor=None,
        sort="new",
        banner_magnet=onchain[2],
        video_ids=video_ids,
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        post_contract_address=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["address"],
        post_contract_abi=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["abi"],
        comment_contract_address=Settings.BLOCKCHAIN_CONTRACTS["Comments"]["address"],
        comment_contract_abi=Settings.BLOCKCHAIN_CONTRACTS["Comments"]["abi"],
        tip_jar_address=Settings.BLOCKCHAIN_CONTRACTS["TipJar"]["address"],
        tip_jar_abi=Settings.BLOCKCHAIN_CONTRACTS["TipJar"]["abi"],
        content=content,
        reading_time=reading_time,
        author_info=author_info,
        blacklisted_comments=deleted_comments,
        hideNavbar=True,
        hideSearch=True,
        word_filters=Settings.BOARD_WORD_FILTERS,
    )


@postBlueprint.route("/post/<int:urlID>/audio")
@postBlueprint.route("/board/<int:urlID>/audio")
def post_audio(urlID: int):
    onchain = _get_onchain_post(urlID)
    if not onchain:
        abort(404)

    parts = onchain[1].split("|", 5)
    text = sub(r"<[^>]+>", "", parts[3] if len(parts) > 3 else "")
    audio_dir = os.path.join(Settings.APP_ROOT_PATH, "static", "audio")
    os.makedirs(audio_dir, exist_ok=True)
    file_path = os.path.join(audio_dir, f"{urlID}.mp3")
    if not os.path.exists(file_path):
        tts = gTTS(text)
        tts.save(file_path)
    return send_file(file_path, mimetype="audio/mpeg")


@postBlueprint.route("/post/<int:urlID>/comment-tree")
@postBlueprint.route("/board/<int:urlID>/comment-tree")
def comment_tree(urlID: int):
    """Return a similarity tree for comments on ``urlID``."""

    contract_info = Settings.BLOCKCHAIN_CONTRACTS["Comments"]
    w3 = Web3(Web3.HTTPProvider(Settings.BLOCKCHAIN_RPC_URL))
    contract = w3.eth.contract(
        address=contract_info["address"], abi=contract_info["abi"]
    )
    try:
        next_id = contract.functions.commentCount().call()
    except Exception as exc:  # pragma: no cover - network errors
        Log.error(f"comment-tree: commentCount failed: {exc}")
        return jsonify({"nodes": [], "links": []})

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
    for cid in range(next_id):
        try:
            c = contract.functions.getComment(cid).call()
        except Exception as exc:  # pragma: no cover - network errors
            Log.error(f"comment-tree: getComment failed: {cid} {exc}")
            continue
        (author, username, email, body, post_id) = c
        if post_id != urlID or cid in deleted:
            continue
        comments.append((cid, username, body))

    tree = build_comment_tree(comments)
    return jsonify(tree)

