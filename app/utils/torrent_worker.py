import os
import subprocess
import sys


def seed(file_path: str) -> None:
    """Seed ``file_path`` using the WebTorrent CLI.

    The magnet URI produced by WebTorrent is printed to stdout so that the
    parent process can capture it before this worker continues seeding
    indefinitely.
    """

    save_path = os.path.dirname(os.path.abspath(file_path)) or os.getcwd()

    cmd = [
        "webtorrent",
        "seed",
        file_path,
        "--keep-seeding",
        "--out",
        save_path,
    ]

    # Capture output so we can forward the magnet URI to the parent process.
    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    # Forward the magnet URI to the caller and discard the remaining output.
    assert proc.stdout is not None
    magnet_printed = False
    for line in proc.stdout:
        if not magnet_printed and line.startswith("Magnet:"):
            print(line.split("Magnet:")[1].strip(), flush=True)
            magnet_printed = True

    # Wait for the WebTorrent process to exit (normally never, since we keep
    # seeding indefinitely).
    proc.wait()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: torrent_worker.py <file_path>")
        sys.exit(1)
    seed(sys.argv[1])
