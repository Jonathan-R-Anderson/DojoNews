"""Blockchain interaction utilities for FlaskBlog.

These helpers show how the application could interact with the
`FlaskBlogPortal` contract deployed on an Ethereum-compatible network
(e.g. zkSync). They do not form a complete replacement for the existing
SQLite database but provide an outline for migration.
"""
from dataclasses import dataclass
from typing import Optional

from web3 import Web3
from web3.contract import Contract


@dataclass
class BlockchainConfig:
    rpc_url: str
    contract_address: str
    abi: list
    sysop_key: Optional[str] = None


def _connect(cfg: BlockchainConfig) -> Contract:
    w3 = Web3(Web3.HTTPProvider(cfg.rpc_url))
    return w3.eth.contract(address=cfg.contract_address, abi=cfg.abi)


def register_user(cfg: BlockchainConfig, user_address: str, tier: int) -> str:
    """Register a user on-chain. Tier values correspond to the `Tier` enum."""
    contract = _connect(cfg)
    sysop = contract.functions.sysop().call()
    tx = contract.functions.registerUser(Web3.to_checksum_address(user_address), tier).build_transaction({
        "from": sysop,
        "nonce": 0,
    })
    return tx.hex()


def send_tip(cfg: BlockchainConfig, author: str, post_id: bytes, amount_wei: int) -> str:
    contract = _connect(cfg)
    tx = contract.functions.tip(Web3.to_checksum_address(author), post_id).build_transaction({
        "from": cfg.contract_address,
        "value": amount_wei,
        "nonce": 0,
    })
    return tx.hex()


def set_sysop_tip_bps(cfg: BlockchainConfig, bps: int) -> str:
    """Set the tip percentage (in basis points) that goes to the sysop."""
    contract = _connect(cfg)
    sysop = contract.functions.sysop().call()
    tx = contract.functions.setSysopTipBps(bps).build_transaction({
        "from": sysop,
        "nonce": 0,
    })
    return tx.hex()


def set_image_magnet(cfg: BlockchainConfig, image_id: str, magnet_uri: str) -> str:
    """Store the magnet URI for a static image on-chain."""
    contract = _connect(cfg)
    sysop = contract.functions.sysop().call()
    tx = contract.functions.setImageMagnet(image_id, magnet_uri).build_transaction({
        "from": sysop,
        "nonce": 0,
    })
    return tx.hex()


def get_image_magnet(cfg: BlockchainConfig, image_id: str) -> str:
    """Fetch the magnet URI for a static image from the chain."""
    contract = _connect(cfg)
    return contract.functions.getImageMagnet(image_id).call()
