import os
import libtorrent as lt

# Maintain a persistent libtorrent session so seeded torrents remain available.
_session = lt.session()
_session.listen_on(6881, 6891)


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
    _session.add_torrent({"ti": ti, "save_path": base_path})
    return lt.make_magnet_uri(ti)
