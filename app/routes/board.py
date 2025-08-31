from flask import Blueprint, render_template
from settings import Settings

boardBlueprint = Blueprint("board", __name__)


@boardBlueprint.route("/board")
def board():
    return render_template(
        "board.html",
        post_contract_address=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["address"],
        post_contract_abi=Settings.BLOCKCHAIN_CONTRACTS["PostStorage"]["abi"],
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        word_filters=Settings.BOARD_WORD_FILTERS,
    )
