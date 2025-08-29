import sqlite3
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
    data = dict(row)
    return jsonify(data)


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
    time_spent = data.get("timeSpent", 0)
    if post_id is None or action not in {"enter", "leave"}:
        return jsonify({"error": "invalid request"}), 400
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO postStats(postID) VALUES (?)", (post_id,)
        )
        row = conn.execute(
            "SELECT currentReaders, totalReaders, avgTimeOnPage FROM postStats WHERE postID=?",
            (post_id,),
        ).fetchone()
        current, total, avg = row
        if action == "enter":
            current += 1
            total += 1
        else:  # leave
            current = max(0, current - 1)
            if time_spent and total > 0:
                avg = ((avg * (total - 1)) + float(time_spent)) / total
        conn.execute(
            "UPDATE postStats SET currentReaders=?, totalReaders=?, avgTimeOnPage=? WHERE postID=?",
            (current, total, avg, post_id),
        )
        conn.commit()
    return jsonify({"message": "ok"})
