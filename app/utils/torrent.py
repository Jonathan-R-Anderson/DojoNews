import os
import subprocess
import sys
import libtorrent as lt


def _spawn_seeder(torrent_path: str, save_path: str) -> None:
    """Launch a background process to seed ``torrent_path``."""
    worker = os.path.join(os.path.dirname(__file__), "torrent_worker.py")
    subprocess.Popen(
        [sys.executable, worker, torrent_path, save_path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
    )


def seed_file(file_path: str) -> str:
    """Create and seed a torrent for ``file_path`` and return its magnet URI."""
    fs = lt.file_storage()
    lt.add_files(fs, file_path)
    t = lt.create_torrent(fs)
    t.add_tracker("udp://tracker.openbittorrent.com:80")
    base_path = os.path.dirname(file_path)
    lt.set_piece_hashes(t, base_path)
    torrent = t.generate()
    torrent_path = file_path + ".torrent"
    with open(torrent_path, "wb") as f:
        f.write(lt.bencode(torrent))
    ti = lt.torrent_info(torrent_path)
    magnet = lt.make_magnet_uri(ti)
    _spawn_seeder(torrent_path, base_path)
    return magnet


def ensure_seeding(directory: str) -> None:
    """Seed any ``.torrent`` files found in ``directory``."""
    if not os.path.isdir(directory):
        return
    for name in os.listdir(directory):
        if not name.endswith(".torrent"):
            continue
        torrent_path = os.path.join(directory, name)
        _spawn_seeder(torrent_path, directory)

