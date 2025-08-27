"""Utility routes for serving and seeding image magnets."""

import os

import libtorrent as lt
from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from settings import Settings
from blockchain import BlockchainConfig, get_image_magnet


magnetBlueprint = Blueprint("magnet", __name__)

# Keep a global libtorrent session so seeded torrents remain available.
_session = lt.session()
_session.listen_on(6881, 6891)


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

    fs = lt.file_storage()
    lt.add_files(fs, image_path)
    t = lt.create_torrent(fs)
    t.add_tracker("udp://tracker.openbittorrent.com:80")
    lt.set_piece_hashes(t, images_dir)
    torrent = t.generate()
    torrent_path = image_path + ".torrent"
    with open(torrent_path, "wb") as f:
        f.write(lt.bencode(torrent))
    ti = lt.torrent_info(torrent_path)
    _session.add_torrent({"ti": ti, "save_path": images_dir})
    magnet = lt.make_magnet_uri(ti)

    return jsonify({"magnet": magnet})
