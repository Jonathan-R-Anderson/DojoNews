import os

from flask import Blueprint, jsonify, render_template, request
from werkzeug.utils import secure_filename

from settings import Settings
from utils.torrent import seed_file, ensure_seeding

createPostBlueprint = Blueprint("createPost", __name__)


@createPostBlueprint.route("/createpost", methods=["GET", "POST"])
def createPost():
    """Handle image uploads, seed them as torrents and return magnet URIs."""
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

    return render_template(
        "createPost.html",
        post_contract_address=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["address"],
        post_contract_abi=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["abi"],
    )
