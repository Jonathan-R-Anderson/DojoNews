import os
import sqlite3
import time

from flask import request, session
from geoip2 import database, errors
from user_agents import parse

from utils.log import Log
from settings import Settings

_reader = None


def _get_reader():
    global _reader
    if _reader is None:
        db_path = os.path.join(
            Settings.APP_ROOT_PATH, "static", "geoIP2database", "dbip-country-lite-2025-02.mmdb"
        )
        if os.path.exists(db_path):
            try:
                _reader = database.Reader(db_path)
            except Exception as exc:  # pragma: no cover - defensive
                Log.error(f"GeoIP load failed: {exc}")
                _reader = None
        else:
            _reader = None
    return _reader


def _lookup_geo(ip: str) -> tuple[str, str]:
    """Return (country, continent) for ``ip``.

    If lookup fails or database missing, returns ("Unknown", "Unknown").
    """

    reader = _get_reader()
    if not reader:
        return "Unknown", "Unknown"
    try:
        resp = reader.country(ip)
        return resp.country.name or "Unknown", resp.continent.name or "Unknown"
    except errors.AddressNotFoundError:
        return "Unknown", "Unknown"
    except Exception as exc:  # pragma: no cover - defensive
        Log.error(f"GeoIP lookup failed: {exc}")
        return "Unknown", "Unknown"


def afterRequestLogger(response):
    """
    This function is used to log the response of an HTTP request.

    Parameters:
        response (Response): The response object returned by the HTTP request.

    Returns:
        Response: The response object returned by the HTTP request.
    """

    message = (
        f"Adress: {request.remote_addr} | Method: {request.method} | Path: {request.path} | "
        f"Scheme: {request.scheme} | Status: {response.status} | Content Length: {response.content_length} | "
        f"Referrer: {request.referrer} | User Agent: {request.user_agent}"
    )
    if response.status == "200 OK":
        Log.success(message)
    elif response.status == "404 NOT FOUND":
        Log.error(message)
    else:
        Log.info(message)

    ip = request.remote_addr or "Unknown"
    country, continent = _lookup_geo(ip)
    user = session.get("walletAddress")
    time_stamp = int(time.time())
    try:
        os_name = parse(request.user_agent.string).os.family
    except Exception:  # pragma: no cover - best effort
        os_name = "Unknown"

    try:
        with sqlite3.connect(Settings.DB_ANALYTICS_ROOT) as conn:
            conn.execute(
                """
                create table if not exists userActivity(
                    id integer primary key autoincrement,
                    ip text,
                    path text,
                    method text,
                    country text,
                    userName text,
                    timeStamp integer
                )
                """
            )
            conn.execute(
                "insert into userActivity(ip, path, method, country, userName, timeStamp) values (?, ?, ?, ?, ?, ?)",
                (ip, request.path, request.method, country, user, time_stamp),
            )

            # Record post view in analytics
            parts = request.path.strip("/").split("/")
            if (
                Settings.ANALYTICS
                and request.method == "GET"
                and len(parts) == 2
                and parts[0] == "post"
            ):
                post_id_str = parts[1].split("-")[-1]
                if post_id_str.isdigit():
                    conn.execute(
                        "insert into postsAnalytics(postID, visitorUserName, country, os, continent, timeStamp) values (?, ?, ?, ?, ?, ?)",
                        (
                            int(post_id_str),
                            user,
                            country,
                            os_name,
                            continent,
                            time_stamp,
                        ),
                    )
            conn.commit()
    except Exception as exc:  # pragma: no cover - analytics is optional
        Log.error(f"Failed to log user activity: {exc}")

    return response
