#!/usr/bin/env python3
"""Move recently modified spam site folders.

This script scans the ``spamsites/annoyingsite`` directory for
subdirectories that were modified in the last 24 hours and moves them to
``spamsites/processed_batch1``. If a destination directory already
exists, the source directory is left in place to avoid overwriting
processed data.
"""
from __future__ import annotations

import argparse
import shutil
import time
from pathlib import Path

SRC = Path("spamsites/annoyingsite")
DEST = Path("spamsites/processed_batch1")


def move_recent_folders(dry_run: bool = False) -> None:
    """Move folders from SRC to DEST when modified in last 24 hours."""
    cutoff = time.time() - 24 * 60 * 60
    for folder in SRC.iterdir():
        if not folder.is_dir():
            continue
        if folder.stat().st_mtime < cutoff:
            continue
        target = DEST / folder.name
        if target.exists():
            continue
        if dry_run:
            print(f"Would move {folder} -> {target}")
        else:
            shutil.move(str(folder), str(target))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print moves without performing them",
    )
    args = parser.parse_args()
    move_recent_folders(dry_run=args.dry_run)
