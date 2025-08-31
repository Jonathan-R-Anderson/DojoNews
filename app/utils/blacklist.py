"""Utilities for blacklisting user content."""
import sqlite3
import requests
from settings import Settings
from utils.log import Log


class Blacklist:
    """Helper methods for managing the blacklist database."""

    @staticmethod
    def add_user_content(user_name: str) -> None:
        """Add all posts and comments of ``user_name`` via the blacklist API."""
        base = f"http://{Settings.BLACKLIST_API_HOST}:{Settings.BLACKLIST_API_PORT}"

        # Blacklist posts
        try:
            conn = sqlite3.connect(Settings.DB_POSTS_ROOT)
            conn.set_trace_callback(Log.database)
            cur = conn.cursor()
            cur.execute("select id from posts where author = ?", (user_name,))
            for (pid,) in cur.fetchall():
                try:
                    requests.post(
                        f"{base}/blacklist",
                        json={"type": "post", "contentID": pid},
                        timeout=5,
                    )
                except Exception as exc:  # pragma: no cover - network errors
                    Log.error(f"Blacklist post {pid} failed: {exc}")
            conn.close()
        except Exception as exc:  # pragma: no cover - database may be missing
            Log.error(f"Blacklist posts failed: {exc}")

        # Blacklist comments
        try:
            conn = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
            conn.set_trace_callback(Log.database)
            cur = conn.cursor()
            cur.execute(
                "select id from comments where lower(user) = ?",
                (user_name.lower(),),
            )
            for (cid,) in cur.fetchall():
                try:
                    requests.post(
                        f"{base}/blacklist",
                        json={"type": "comment", "contentID": cid},
                        timeout=5,
                    )
                except Exception as exc:  # pragma: no cover - network errors
                    Log.error(f"Blacklist comment {cid} failed: {exc}")
            conn.close()
        except Exception as exc:  # pragma: no cover - database may be missing
            Log.error(f"Blacklist comments failed: {exc}")

        Log.success(f'Content for "{user_name}" added to blacklist')
