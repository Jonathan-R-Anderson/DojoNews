from flask import session
from settings import Settings


def inject_blockchain():
    """Expose blockchain configuration to templates."""
    if "walletAddress" not in session:
        return {}
    post_contract = Settings.BLOCKCHAIN_CONTRACTS.get("PostStorage", {})
    return {
        "rpc_url": Settings.BLOCKCHAIN_RPC_URL,
        "post_contract_address": post_contract.get("address", ""),
        "post_contract_abi": post_contract.get("abi", []),
    }
