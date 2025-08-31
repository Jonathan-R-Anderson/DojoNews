from settings import Settings


def inject_blockchain():
    """Expose blockchain configuration to templates."""
    contracts = Settings.BLOCKCHAIN_CONTRACTS
    post_storage = contracts.get("PostStorage", {})
    posts = contracts.get("Posts", {})
    comments = contracts.get("Comments", {})
    board = contracts.get("Board", {})
    tip_jar = contracts.get("TipJar", {})

    return {
        "rpc_url": Settings.BLOCKCHAIN_RPC_URL,
        "post_contract_address": post_storage.get("address", ""),
        "post_contract_abi": post_storage.get("abi", []),
        "posts_contract_address": posts.get("address", ""),
        "posts_contract_abi": posts.get("abi", []),
        "comment_contract_address": comments.get("address", ""),
        "comment_contract_abi": comments.get("abi", []),
        "board_contract_address": board.get("address", ""),
        "board_contract_abi": board.get("abi", []),
        "tip_jar_address": tip_jar.get("address", ""),
        "tip_jar_abi": tip_jar.get("abi", []),
    }
