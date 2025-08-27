import os

from flask import Blueprint, jsonify, render_template, request, session, redirect
from werkzeug.utils import secure_filename

from settings import Settings
from utils.flashMessage import flashMessage
from utils.forms.CreatePostForm import CreatePostForm
from utils.log import Log
from utils.categories import get_categories
from utils.torrent import seed_file, ensure_seeding

createPostBlueprint = Blueprint("createPost", __name__)


@createPostBlueprint.route("/createpost", methods=["GET", "POST"])
def createPost():
    """Seed uploaded banners and render the post creation page."""
    if request.method == "POST":
        image = request.files.get("postBanner")
        if not image or image.filename == "":
            return jsonify({"error": "no image supplied"}), 400

        images_dir = os.path.join(Settings.APP_ROOT_PATH, "images")
        os.makedirs(images_dir, exist_ok=True)
        filename = secure_filename(image.filename)
        image_path = os.path.join(images_dir, filename)
        image.save(image_path)

        magnet = seed_file(image_path)
        ensure_seeding(images_dir)
        return jsonify({"magnet": magnet})

    if "userName" not in session:
        Log.error(f"{request.remote_addr} tried to create a new post without login")
        flashMessage(
            page="createPost",
            message="login",
            category="error",
            language=session.get("language", "en"),
        )
        return redirect("/login?redirect=/createpost")

    categories = get_categories()
    form = CreatePostForm()
    form.postCategory.choices = [(c, c) for c in categories]
    post_contract = Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]
    return render_template(
        "createPost.html",
        form=form,
        categories=categories,
        post_contract_address=post_contract["address"],
        post_contract_abi=post_contract["abi"],
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
    )
