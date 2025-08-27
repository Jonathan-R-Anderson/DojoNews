"""Return magnet URIs for static images via the blockchain contract."""

from flask import Blueprint, jsonify

from settings import Settings
from blockchain import BlockchainConfig, get_image_magnet
from requests.exceptions import RequestException


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
