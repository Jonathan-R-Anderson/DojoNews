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

