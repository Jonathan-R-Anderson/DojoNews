"""Utility routes for serving and seeding image magnets."""

import os

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from settings import Settings
from blockchain import BlockchainConfig, get_image_magnet
from utils.torrent import seed_file


magnetBlueprint = Blueprint("magnet", __name__)


@magnetBlueprint.route("/magnet/<string:image_id>")
def fetch_magnet(image_id: str):
    """Fetch the magnet URL for ``image_id`` from the smart contract."""
    contract = Settings.BLOCKCHAIN_CONTRACTS["ImageStorage"]
    cfg = BlockchainConfig(
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        contract_address=contract["address"],
        abi=contract["abi"],
    )
    try:
        magnet = get_image_magnet(cfg, image_id)
    except Exception:
        magnet = ""
    return jsonify({"magnet": magnet})


@magnetBlueprint.route("/magnet/seed", methods=["POST"])
def seed_image():
    """Accept an uploaded image, seed it via BitTorrent and return the magnet URI."""
    image = request.files.get("image")
    if not image:
        return jsonify({"error": "no image supplied"}), 400

    filename = secure_filename(image.filename)
    images_dir = os.path.join(Settings.APP_ROOT_PATH, "images")
    os.makedirs(images_dir, exist_ok=True)
    image_path = os.path.join(images_dir, filename)
    image.save(image_path)

    magnet = seed_file(image_path)
    return jsonify({"magnet": magnet})
