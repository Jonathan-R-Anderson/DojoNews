"""Utilities for blacklisting user content."""
import sqlite3
from settings import Settings
from utils.log import Log


class Blacklist:
    """Helper methods for managing the blacklist database."""

    @staticmethod
    def add_user_content(user_name: str) -> None:
        """Add all posts and comments of ``user_name`` to the blacklist table.

        The function collects IDs of posts and comments authored by ``user_name``
        and stores them in ``Settings.DB_BLACKLIST_ROOT``.
        """
        Log.database(f"Connecting to '{Settings.DB_BLACKLIST_ROOT}' database")
        bl_conn = sqlite3.connect(Settings.DB_BLACKLIST_ROOT)
        bl_conn.set_trace_callback(Log.database)
        bl_cur = bl_conn.cursor()
        bl_cur.execute(
            """
            create table if not exists blacklist(
                id integer primary key autoincrement,
                type text not null,
                contentID integer not null
            )
            """
        )

        # Blacklist posts
        try:
            conn = sqlite3.connect(Settings.DB_POSTS_ROOT)
            conn.set_trace_callback(Log.database)
            cur = conn.cursor()
            cur.execute("select id from posts where author = ?", (user_name,))
            for (pid,) in cur.fetchall():
                bl_cur.execute(
                    "insert into blacklist(type, contentID) values(?, ?)",
                    ("post", pid),
                )
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
                bl_cur.execute(
                    "insert into blacklist(type, contentID) values(?, ?)",
                    ("comment", cid),
                )
            conn.close()
        except Exception as exc:  # pragma: no cover - database may be missing
            Log.error(f"Blacklist comments failed: {exc}")

        bl_conn.commit()
        bl_conn.close()
        Log.success(f'Content for "{user_name}" added to blacklist')
