import os
import sys
import time
import libtorrent as lt


def seed(torrent_path: str) -> None:
    """Seed ``torrent_path`` in a dedicated libtorrent session.

    The files to be seeded are assumed to live alongside the ``.torrent``
    file. This removes the need to explicitly provide a ``save_path``.
    """

    # Determine where the content lives based on the torrent file location
    save_path = os.path.dirname(os.path.abspath(torrent_path)) or os.getcwd()

    ses = lt.session()

    # ``listen_on`` is deprecated; configure the interface via settings pack
    settings = lt.settings_pack()
    settings.set_str("listen_interfaces", "0.0.0.0:6881")
    ses.apply_settings(settings)

    ti = lt.torrent_info(torrent_path)
    ses.add_torrent({"ti": ti, "save_path": save_path})

    # Keep the process alive indefinitely to continue seeding
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: torrent_worker.py <torrent_path>")
        sys.exit(1)
    seed(sys.argv[1])

