from pathlib import Path

from app.blockchain import BlockchainConfig, set_image_magnet
from app.settings import Settings
from app.utils.torrent import seed_file


def seed_images(image_dir: str = "images") -> None:
    """Create and seed torrents for images in ``image_dir``.

    The server continues to host the original files, while seeding them on
    BitTorrent for additional distribution capacity.
    """
    contract = Settings.BLOCKCHAIN_CONTRACTS["ImageStorage"]
    cfg = BlockchainConfig(
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        contract_address=contract["address"],
        abi=contract["abi"],
    )
    for img in Path(image_dir).glob("*"):
        if img.is_file():
            magnet = seed_file(str(img))
            torrent_path = img.with_suffix(img.suffix + ".torrent")
            tx = set_image_magnet(cfg, img.name, magnet)
            print(
                f"Seeding {img.name} (torrent: {torrent_path.name}) - stored magnet tx {tx}"
            )
    print("Seeding started. Keep this process running to continue seeding.")


if __name__ == "__main__":
    seed_images()
