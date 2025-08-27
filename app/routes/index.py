"""
This file contains the routes for the Flask application.

The Blueprint "index" is used to define the home page of the application.
The route "/" maps the index function to the home page.

The index function retrieves all posts from the database and passes them to the index.html template.

The posts variable is passed to the index.html template as a list of dictionaries.

The index.html template displays the title and content of each post.

DISCLAIMER: This code is the property of the repository owner and is not intended for
use without explicit permission from the owner. The code is provided as-is and is
subject to change without notice. Use of this code for commercial or non-commercial
purposes without permission is strictly prohibited.
"""

from json import load

from flask import (
    Blueprint,
    redirect,
    render_template,
    session,
    request,
    jsonify,
    url_for,
)
from settings import Settings
from utils.log import Log
from utils.paginate import paginate_query
from utils.categories import get_categories
from utils.generateUrlIdFromPost import getSlugFromPostTitle
from utils.getProfilePicture import getProfilePicture
from blockchain import BlockchainConfig, get_image_magnet

indexBlueprint = Blueprint("index", __name__)


@indexBlueprint.route("/")
@indexBlueprint.route("/by=<by>/sort=<sort>")
def index(by="views", sort="desc"):
    """
    This function maps the home page route ("/") to the index function.

    It retrieves all posts from the database and passes them to the index.html template.

    The posts variable is passed to the index.html template as a list of dictionaries.

    The index.html template displays the title and content of each post.

    Parameters:
    by (str): The field to sort by. Options are "timeStamp", "title", "views", "category", "lastEditTimeStamp", "hot".
    sort (str): The order to sort in. Options are "asc" or "desc".

    Returns:
    The rendered template of the home page with sorted posts according to the provided sorting options.
    """

    byOptions = ["timeStamp", "title", "views", "category", "lastEditTimeStamp", "hot"]
    sortOptions = ["asc", "desc"]

    if by not in byOptions or sort not in sortOptions:
        Log.warning(
            f"The provided sorting options are not valid: By: {by} Sort: {sort}"
        )
        return redirect("/")

    if by == "hot":
        select_query = (
            "SELECT *, (views * 1 / log(1 + (strftime('%s', 'now') - timeStamp) / 3600 + 2)) "
            f"AS hotScore FROM posts ORDER BY hotScore {sort}"
        )
    else:
        select_query = f"select * from posts order by {by} {sort}"

    posts, page, total_pages = paginate_query(
        Settings.DB_POSTS_ROOT,
        "select count(*) from posts",
        select_query,
    )

    original_by = by
    if by == "timeStamp":
        translation_by = "create"
    elif by == "lastEditTimeStamp":
        translation_by = "edit"
    else:
        translation_by = by

    language = session.get("language")
    translationFile = f"./translations/{language}.json"
    with open(translationFile, "r", encoding="utf-8") as file:
        translations = load(file)

    translations = translations["sortMenu"]

    sortName = translations[translation_by] + " - " + translations[sort]

    Log.info(f"Sorting posts on index page by: {sortName}")

    return render_template(
        "index.html",
        posts=posts,
        sortName=sortName,
        source="",
        page=page,
        total_pages=total_pages,
        by=original_by,
        sort=sort,
        categories=get_categories(),
    )


@indexBlueprint.route("/api/posts")
def api_posts():
    """Return post data along with magnet URIs."""
    category = request.args.get("category")

    base_select = (
        "select id, title, author, timeStamp, category, urlID, abstract from posts"
    )
    base_count = "select count(*) from posts"
    params = []
    if category:
        base_select += " where lower(category) = ?"
        base_count += " where lower(category) = ?"
        params.append(category.lower())
    base_select += " order by timeStamp desc"

    posts, _, _ = paginate_query(
        Settings.DB_POSTS_ROOT, base_count, base_select, params, per_page=50
    )

    contract = Settings.BLOCKCHAIN_CONTRACTS.get("ImageStorage", {})
    cfg = BlockchainConfig(
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        contract_address=contract.get("address", "0x0"),
        abi=contract.get("abi", []),
    )

    data = []
    for p in posts:
        try:
            magnet = get_image_magnet(cfg, f"{p[0]}.png")
        except Exception:
            magnet = ""
        data.append(
            {
                "id": p[0],
                "title": p[1],
                "author": p[2],
                "timestamp": p[3],
                "category": p[4],
                "url": url_for(
                    "post.post", slug=getSlugFromPostTitle(p[1]), urlID=p[5]
                ),
                "abstract": p[6],
                "author_picture": getProfilePicture(p[2]),
                "magnet": magnet,
            }
        )

    return jsonify({"posts": data})


@indexBlueprint.route("/load_posts")
def load_posts():
    """Return additional posts for infinite scrolling."""

    by = request.args.get("by", "views")
    sort = request.args.get("sort", "desc")

    byOptions = ["timeStamp", "title", "views", "category", "lastEditTimeStamp", "hot"]
    sortOptions = ["asc", "desc"]

    if by not in byOptions or sort not in sortOptions:
        Log.warning(
            f"The provided sorting options are not valid: By: {by} Sort: {sort}"
        )
        return "", 400

    if by == "hot":
        select_query = (
            "SELECT *, (views * 1 / log(1 + (strftime('%s', 'now') - timeStamp) / 3600 + 2)) "
            f"AS hotScore FROM posts ORDER BY hotScore {sort}"
        )
    else:
        select_query = f"select * from posts order by {by} {sort}"

    limit = request.args.get("limit", type=int)
    posts, _, _ = paginate_query(
        Settings.DB_POSTS_ROOT,
        "select count(*) from posts",
        select_query,
        per_page=limit or 9,
    )

    return render_template("components/postCards.html", posts=posts)
