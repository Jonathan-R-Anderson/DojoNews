import sqlite3
import time
from flask import Blueprint, request, jsonify, session
from settings import Settings

postStatsBlueprint = Blueprint("postStats", __name__)
DB_PATH = Settings.DB_ANALYTICS_ROOT


def _init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS postStats(
                postID INTEGER PRIMARY KEY,
                estimatedReadTime INTEGER DEFAULT 0,
                avgTimeOnPage REAL DEFAULT 0,
                totalReaders INTEGER DEFAULT 0,
                currentReaders INTEGER DEFAULT 0
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS postActiveReaders(
                postID INTEGER,
                sessionID TEXT,
                lastSeen INTEGER,
                PRIMARY KEY (postID, sessionID)
            )
            """
        )
        conn.commit()


_init_db()


@postStatsBlueprint.route("/api/v1/postStats", methods=["GET"])
def get_post_stats():
    post_id = request.args.get("postID", type=int)
    if post_id is None:
        return jsonify({"error": "postID is required"}), 400
    now = int(time.time())
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute(
            "DELETE FROM postActiveReaders WHERE lastSeen < ?",
            (now - 30,),
        )
        # Ensure a stats row exists for the post
        row = conn.execute(
            "SELECT * FROM postStats WHERE postID=?", (post_id,)
        ).fetchone()
        if row is None:
            conn.execute("INSERT INTO postStats(postID) VALUES (?)", (post_id,))
            conn.commit()
            row = conn.execute(
                "SELECT * FROM postStats WHERE postID=?", (post_id,)
            ).fetchone()

        # Fetch up-to-date analytics for the post
        analytics = conn.execute(
            """
            SELECT COUNT(*) AS totalReaders,
                   AVG(timeSpendDuration) AS avgTimeOnPage
            FROM postsAnalytics
            WHERE postID=?
            """,
            (post_id,),
        ).fetchone()

        total_readers = analytics["totalReaders"] or 0
        avg_time = analytics["avgTimeOnPage"] or 0

        # Persist the calculated analytics to the stats table
        conn.execute(
            "UPDATE postStats SET totalReaders=?, avgTimeOnPage=? WHERE postID=?",
            (total_readers, avg_time, post_id),
        )
        current = conn.execute(
            "SELECT COUNT(*) FROM postActiveReaders WHERE postID=?",
            (post_id,),
        ).fetchone()[0]
        conn.execute(
            "UPDATE postStats SET currentReaders=? WHERE postID=?",
            (current, post_id),
        )
        conn.commit()

        row = conn.execute(
            "SELECT * FROM postStats WHERE postID=?", (post_id,)
        ).fetchone()

    data = dict(row)
    response = jsonify(data)
    response.headers["Cache-Control"] = "no-store"
    return response


@postStatsBlueprint.route("/api/v1/postStats", methods=["POST"])
def update_post_stats():
    if session.get("userRole") != "admin":
        return jsonify({"error": "forbidden"}), 403
    data = request.get_json(silent=True) or {}
    post_id = data.get("postID")
    if post_id is None:
        return jsonify({"error": "postID is required"}), 400
    fields = {
        k: data[k]
        for k in [
            "estimatedReadTime",
            "avgTimeOnPage",
            "totalReaders",
            "currentReaders",
        ]
        if k in data
    }
    if not fields:
        return jsonify({"error": "no fields to update"}), 400
    placeholders = ", ".join(f"{k}=?" for k in fields.keys())
    values = list(fields.values()) + [post_id]
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("INSERT OR IGNORE INTO postStats(postID) VALUES (?)", (post_id,))
        conn.execute(f"UPDATE postStats SET {placeholders} WHERE postID=?", values)
        conn.commit()
    return jsonify({"message": "ok"})


@postStatsBlueprint.route("/api/v1/postStats/activity", methods=["POST"])
def post_activity():
    data = request.get_json(silent=True) or {}
    post_id = data.get("postID")
    action = data.get("action")
    session_id = data.get("sessionID")
    time_spent = data.get("timeSpent", 0)
    if (
        post_id is None
        or action not in {"enter", "leave", "heartbeat"}
        or not session_id
    ):
        return jsonify({"error": "invalid request"}), 400
    now = int(time.time())
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO postStats(postID) VALUES (?)", (post_id,)
        )
        conn.execute(
            "DELETE FROM postActiveReaders WHERE lastSeen < ?",
            (now - 30,),
        )
        if action in {"enter", "heartbeat"}:
            conn.execute(
                "INSERT OR REPLACE INTO postActiveReaders(postID, sessionID, lastSeen) VALUES (?, ?, ?)",
                (post_id, session_id, now),
            )
        else:  # leave
            conn.execute(
                "DELETE FROM postActiveReaders WHERE postID=? AND sessionID=?",
                (post_id, session_id),
            )
            row = conn.execute(
                "SELECT totalReaders, avgTimeOnPage FROM postStats WHERE postID=?",
                (post_id,),
            ).fetchone()
            total, avg = row
            if time_spent and total > 0:
                avg = ((avg * (total - 1)) + float(time_spent)) / total
            conn.execute(
                "UPDATE postStats SET avgTimeOnPage=? WHERE postID=?",
                (avg, post_id),
            )
        if action == "enter":
            total = (
                conn.execute(
                    "SELECT totalReaders FROM postStats WHERE postID=?", (post_id,)
                ).fetchone()[0]
                + 1
            )
            conn.execute(
                "UPDATE postStats SET totalReaders=? WHERE postID=?",
                (total, post_id),
            )
        current = conn.execute(
            "SELECT COUNT(*) FROM postActiveReaders WHERE postID=?",
            (post_id,),
        ).fetchone()[0]
        conn.execute(
            "UPDATE postStats SET currentReaders=? WHERE postID=?",
            (current, post_id),
        )
        conn.commit()
    return jsonify({"message": "ok"})
