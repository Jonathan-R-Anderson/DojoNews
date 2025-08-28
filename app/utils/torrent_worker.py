import os
import sys
import subprocess


def seed(torrent_path: str) -> None:
    """Seed ``torrent_path`` using the WebTorrent CLI.

    The files referenced by the ``.torrent`` file are expected to live
    alongside it. The WebTorrent command line tool is used to verify the
    files and keep them seeding indefinitely.
    """

    save_path = os.path.dirname(os.path.abspath(torrent_path)) or os.getcwd()

    cmd = [
        "webtorrent",
        "download",
        torrent_path,
        "--keep-seeding",
        "--out",
        save_path,
    ]

    proc = subprocess.Popen(cmd)
    try:
        proc.wait()
    except KeyboardInterrupt:
        proc.terminate()
        proc.wait()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: torrent_worker.py <torrent_path>")
        sys.exit(1)
    seed(sys.argv[1])
