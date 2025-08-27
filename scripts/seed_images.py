from pathlib import Path

import libtorrent as lt

from app.blockchain import BlockchainConfig, set_image_magnet
from app.settings import Settings


def seed_images(image_dir: str = "images") -> None:
    """Create and seed torrents for images in ``image_dir``.

    The server continues to host the original files, while seeding them on
    BitTorrent for additional distribution capacity.
    """
    ses = lt.session()
    ses.listen_on(6881, 6891)
    cfg = BlockchainConfig(
        rpc_url=Settings.BLOCKCHAIN_RPC_URL,
        contract_address=Settings.BLOCKCHAIN_CONTRACT_ADDRESS,
        abi=Settings.BLOCKCHAIN_ABI,
    )
    for img in Path(image_dir).glob("*"):
        if img.is_file():
            fs = lt.file_storage()
            lt.add_files(fs, str(img))
            t = lt.create_torrent(fs)
            t.add_tracker("udp://tracker.openbittorrent.com:80")
            lt.set_piece_hashes(t, str(img.parent))
            torrent = t.generate()
            torrent_path = img.with_suffix(img.suffix + ".torrent")
            with open(torrent_path, "wb") as f:
                f.write(lt.bencode(torrent))
            ti = lt.torrent_info(torrent_path)
            ses.add_torrent({"ti": ti, "save_path": str(img.parent)})
            magnet = lt.make_magnet_uri(ti)
            tx = set_image_magnet(cfg, img.name, magnet)
            print(
                f"Seeding {img.name} (torrent: {torrent_path.name}) - stored magnet tx {tx}"
            )
    print("Seeding started. Keep this process running to continue seeding.")


if __name__ == "__main__":
    seed_images()
