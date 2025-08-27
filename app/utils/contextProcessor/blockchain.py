from settings import Settings


def inject_blockchain():
    """Expose blockchain configuration to templates."""
    image_contract = Settings.BLOCKCHAIN_CONTRACTS.get("ImageStorage", {})
    return {
        "rpc_url": Settings.BLOCKCHAIN_RPC_URL,
        "image_contract_address": image_contract.get("address", ""),
        "image_contract_abi": image_contract.get("abi", []),
    }
