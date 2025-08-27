import hashlib
import os

from flask import Blueprint, redirect, render_template, request, session, flash
from settings import Settings
from utils.flashMessage import flashMessage
from utils.forms.CreatePostForm import CreatePostForm
from utils.log import Log
from utils.categories import get_categories, DEFAULT_CATEGORIES
from blockchain import (
    BlockchainConfig,
    set_image_magnet,
    create_post,
    get_next_post_id,
)

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
            postBannerFile = request.files["postBanner"]
            bannerMagnet = request.form.get("postBannerMagnet", "")
            selectedCategory = request.form.get("postCategory", "").strip()
            newCategory = request.form.get("newCategory", "").strip()

            category_candidate = newCategory if newCategory else selectedCategory

            if not category_candidate:
                flash("Category is required.", "error")
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
                try:
                    contract = Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]
                    cfg = BlockchainConfig(
                        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
                        contract_address=contract["address"],
                        abi=contract["abi"],
                    )
                    post_id = get_next_post_id(cfg)
                    payload = (
                        f"{postTitle}|{postTags}|{postAbstract}|{postContent}|{postCategory}|{bannerMagnet}"
                    )
                    create_post(cfg, payload)
                    if postBannerFile:
                        images_dir = os.path.join(Settings.APP_ROOT_PATH, "images")
                        os.makedirs(images_dir, exist_ok=True)
                        postBannerFile.save(os.path.join(images_dir, f"{post_id}.png"))
                    if bannerMagnet:
                        contract_img = Settings.BLOCKCHAIN_CONTRACTS["ImageStorage"]
                        cfg_img = BlockchainConfig(
                            rpc_url=Settings.BLOCKCHAIN_RPC_URL,
                            contract_address=contract_img["address"],
                            abi=contract_img["abi"],
                        )
                        set_image_magnet(cfg_img, f"{post_id}.png", bannerMagnet)
                except Exception as e:
                    Log.error(f"Failed to store post on-chain: {e}")

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
            post_contract_address=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["address"],
            post_contract_abi=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["abi"],
        )
    else:
        Log.error(f"{request.remote_addr} tried to create a new post without login")
        flashMessage(
            page="createPost",
            message="login",
            category="error",
            language=session["language"],
        )
        return redirect("/login?redirect=/createpost")
