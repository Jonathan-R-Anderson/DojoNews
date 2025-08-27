import sys
import time
import libtorrent as lt


def seed(torrent_path: str, save_path: str) -> None:
    """Seed ``torrent_path`` in a dedicated libtorrent session."""
    ses = lt.session()
    ses.listen_on(6881, 6891)
    ti = lt.torrent_info(torrent_path)
    ses.add_torrent({"ti": ti, "save_path": save_path})
    # Keep the process alive indefinitely to continue seeding
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: torrent_worker.py <torrent_path> <save_path>")
        sys.exit(1)
    seed(sys.argv[1], sys.argv[2])

