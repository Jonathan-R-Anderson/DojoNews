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

from flask import Blueprint, render_template, session
from settings import Settings
from utils.categories import get_categories

indexBlueprint = Blueprint("index", __name__)


@indexBlueprint.route("/")
def index():
    """Render index page with blockchain details if user is logged in."""
    if "walletAddress" not in session:
        return ""

    return render_template(
        "index.html",
        sortName="",
        source="",
        page=1,
        total_pages=1,
        by="views",
        sort="desc",
        categories=get_categories(),
        post_contract_address=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["address"],
        post_contract_abi=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["abi"],
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
    )
