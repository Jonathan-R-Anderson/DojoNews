from flask import session
from settings import Settings


def inject_blockchain():
    """Expose blockchain configuration to templates."""
    if "walletAddress" not in session:
        return {}
    post_contract = Settings.BLOCKCHAIN_CONTRACTS.get("PostStorage", {})
    comment_contract = Settings.BLOCKCHAIN_CONTRACTS.get("CommentStorage", {})
    tip_jar_contract = Settings.BLOCKCHAIN_CONTRACTS.get("TipJar", {})
    return {
        "rpc_url": Settings.BLOCKCHAIN_RPC_URL,
        "post_contract_address": post_contract.get("address", ""),
        "post_contract_abi": post_contract.get("abi", []),
        "comment_contract_address": comment_contract.get("address", ""),
        "comment_contract_abi": comment_contract.get("abi", []),
        "tip_jar_address": tip_jar_contract.get("address", ""),
        "tip_jar_abi": tip_jar_contract.get("abi", []),
    }
