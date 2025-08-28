import sqlite3
from flask import Blueprint, request, jsonify
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
        conn.commit()


_init_db()


@postStatsBlueprint.route("/api/v1/postStats", methods=["GET"])
def get_post_stats():
    post_id = request.args.get("postID", type=int)
    if post_id is None:
        return jsonify({"error": "postID is required"}), 400
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM postStats WHERE postID=?", (post_id,)
        ).fetchone()
        if row is None:
            conn.execute("INSERT INTO postStats(postID) VALUES (?)", (post_id,))
            conn.commit()
            row = conn.execute(
                "SELECT * FROM postStats WHERE postID=?", (post_id,)
            ).fetchone()
    return jsonify(dict(row))


@postStatsBlueprint.route("/api/v1/postStats", methods=["POST"])
def update_post_stats():
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
