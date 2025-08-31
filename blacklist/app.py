import os
import sqlite3
from flask import Flask, request, jsonify

DB_PATH = os.environ.get("DB_PATH", "/db/blacklist.db")

app = Flask(__name__)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """create table if not exists blacklist(
        id integer primary key autoincrement,
        type text not null,
        contentID integer not null
    )"""
    )
    conn.close()


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.route("/blacklist", methods=["GET"])
def get_blacklist():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("select type, contentID from blacklist")
    data = [dict(row) for row in cur.fetchall()]
    conn.close()
    return jsonify(data)


@app.route("/blacklist", methods=["POST"])
def add_blacklist():
    payload = request.get_json(force=True)
    btype = payload.get("type")
    cid = payload.get("contentID")
    if not btype or cid is None:
        return jsonify({"error": "missing fields"}), 400
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "insert into blacklist(type, contentID) values(?, ?)", (btype, cid)
    )
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"}), 201


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5001)
