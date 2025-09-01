import os
import subprocess
import sys
from typing import List


_seeding_processes: List[subprocess.Popen] = []


def _spawn_seeder(file_path: str, stdout=None) -> subprocess.Popen:
    """Launch a background process to seed ``file_path``."""

    worker = os.path.join(os.path.dirname(__file__), "torrent_worker.py")
    proc = subprocess.Popen(
        [sys.executable, worker, file_path],
        stdout=stdout if stdout is not None else subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        text=True,
        close_fds=True,
    )
    _seeding_processes.append(proc)
    return proc


def seed_file(file_path: str) -> str:
    """Seed ``file_path`` and return its magnet URI."""

    proc = _spawn_seeder(file_path, stdout=subprocess.PIPE)
    assert proc.stdout is not None
    magnet = proc.stdout.readline().strip()
    proc.stdout.close()

    # ``magnet`` will be empty if the seeding process failed before
    # printing the magnet URI.  This commonly happens when the WebTorrent
    # CLI is not installed or exits with an error.  Surfacing a helpful
    # exception allows callers to report a meaningful message instead of
    # silently returning an empty string which later triggers a generic
    # "upload failed" error in the UI.
    if not magnet:
        proc.wait()  # reap the worker to avoid zombies
        raise RuntimeError("failed to seed file – is webtorrent installed?")

    return magnet


def ensure_seeding(directory: str) -> None:
    """Seed any files found in ``directory``."""
    if not os.path.isdir(directory):
        return
    for name in os.listdir(directory):
        file_path = os.path.join(directory, name)
        if os.path.isdir(file_path):
            continue
        _spawn_seeder(file_path)

