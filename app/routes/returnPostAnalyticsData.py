import sqlite3

from flask import Blueprint, make_response, request, session
from settings import Settings
from utils.getAnalyticsPageData import (
    getAnalyticsPageCountryGraphData,
    getAnalyticsPageTrafficGraphData,
    getSiteCountryGraphData,
    getSiteTrafficGraphData,
)
from utils.log import Log

returnPostAnalyticsDataBlueprint = Blueprint("returnPostTrafficGraphData", __name__)


@returnPostAnalyticsDataBlueprint.route("/api/v1/postTrafficGraphData")
def returnPostTrafficGraphData() -> dict:
    """
    Retrieves traffic graph data for a given post.

    This API fetches traffic analytics for a specific post, allowing filtering based on
    the time since the post was published.

    Args (Query Parameters):
        if None of below kwargs are given then default will be last 48 hours data
        - `postID` (int, required): The ID of the post for which traffic data is requested.
        - `sincePosted` (bool, optional): If `True`, fetches data since the post was published and other kwargs will be ignored.
        - `weeks` (float, optional): Number of weeks to filter the traffic data.
        - `days` (float, optional): Number of days to filter the traffic data.
        - `hours` (float, optional): Number of hours to filter the traffic data.

    Returns:
        - `200 OK`: Successfully retrieves graph data.
        - `403 Forbidden`: If the client is not authenticated.
        - `404 Not Found`: If `postID` is missing.
        - `410 Gone`: If analytics is disabled by the admin.
    """

    postID = request.args.get("postID", type=int)

    sincePosted = str(request.args.get("sincePosted", default=False)).lower() == "true"

    weeks = request.args.get("weeks", type=float, default=0)

    days = request.args.get("days", type=float, default=0)

    hours = request.args.get("hours", type=float, default=0)

    if Settings.ANALYTICS:
        if "walletAddress" in session and session.get("userRole") == "admin":
            if postID:
                return make_response(
                    {
                        "payload": getAnalyticsPageTrafficGraphData(
                            postID=postID,
                            sincePosted=sincePosted,
                            weeks=weeks,
                            days=days,
                            hours=hours,
                        )
                    },
                    200,
                )
            else:
                return make_response(
                    {
                        "message": "Missing postID; unable to retrieve data.",
                        "error": "postID (type: int) is required.",
                    },
                    404,
                )
        else:
            return make_response(
                {
                    "message": "client don't have permission",
                    "error": "request denied",
                },
                403,
            )
    else:
        return ({"message": "analytics is disabled by admin"}, 410)


@returnPostAnalyticsDataBlueprint.route("/api/v1/postCountryGraphData")
def returnPostCountryGraphData() -> dict:
    """
    Retrieves country-based graph data for a given post.

    This API returns country-wise analytics data for a specific post ID,
    providing insights into the geographical distribution of viewers.

    Args (Query Parameters):
        `postID` (int, required): The ID of the post for which analytics data is requested.
        `viewAll` (bool, optional): If `True`, returns data for all time; otherwise, return top 25 countries.

    Returns:
        `200 OK`: Successfully retrieves graph data.
        `403 Forbidden`: If the client is not authenticated.
        `404 Not Found`: If `postID` is missing.
        `410 Gone`: If analytics is disabled by the admin.
    """

    postID = request.args.get("postID", type=int)

    viewAll = str(request.args.get("viewAll", default=False)).lower() == "true"

    if Settings.ANALYTICS:
        if "walletAddress" in session and session.get("userRole") == "admin":
            if postID:
                return make_response(
                    {
                        "payload": getAnalyticsPageCountryGraphData(
                            postID=postID, viewAll=viewAll
                        )
                    },
                    200,
                )
            else:
                return make_response(
                    {
                        "message": "Missing postID; unable to retrieve data.",
                        "error": "postID (type: int) is required.",
                    },
                    404,
                )
        else:
            return make_response(
                {
                    "message": "client don't have permission",
                    "error": "request denied",
                },
                403,
            )
    else:
        return make_response({"message": "analytics is disabled by admin"}, 410)


@returnPostAnalyticsDataBlueprint.route("/api/v1/siteTrafficGraphData")
def returnSiteTrafficGraphData() -> dict:
    """Return site-wide traffic graph data."""

    sincePosted = str(request.args.get("sincePosted", default=False)).lower() == "true"
    weeks = request.args.get("weeks", type=float, default=0)
    days = request.args.get("days", type=float, default=0)
    hours = request.args.get("hours", type=float, default=0)

    if Settings.ANALYTICS:
        if "walletAddress" in session and session.get("userRole") == "admin":
            return make_response(
                {
                    "payload": getSiteTrafficGraphData(
                        sincePosted=sincePosted, weeks=weeks, days=days, hours=hours
                    )
                },
                200,
            )
        else:
            return make_response(
                {"message": "client don't have permission", "error": "request denied"},
                403,
            )
    else:
        return ({"message": "analytics is disabled by admin"}, 410)


@returnPostAnalyticsDataBlueprint.route("/api/v1/siteCountryGraphData")
def returnSiteCountryGraphData() -> dict:
    """Return site-wide country graph data."""

    viewAll = str(request.args.get("viewAll", default=False)).lower() == "true"

    if Settings.ANALYTICS:
        if "walletAddress" in session and session.get("userRole") == "admin":
            return make_response(
                {"payload": getSiteCountryGraphData(viewAll=viewAll)},
                200,
            )
        else:
            return make_response(
                {"message": "client don't have permission", "error": "request denied"},
                403,
            )
    else:
        return ({"message": "analytics is disabled by admin"}, 410)


@returnPostAnalyticsDataBlueprint.route("/api/v1/siteStats")
def return_site_stats() -> dict:
    """Return counts for site analytics tiles."""

    if Settings.ANALYTICS:
        if "walletAddress" in session and session.get("userRole") == "admin":
            try:
                connection = sqlite3.connect(Settings.DB_ANALYTICS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()

                cursor.execute("select count(*) from postsAnalytics")
                totalVisitor = cursor.fetchone()[0] or 0
                connection.close()

                todaysVisitorData = getSiteTrafficGraphData(hours=24)
                todaysVisitor = 0
                for views in todaysVisitorData:
                    todaysVisitor += int(views[1])

                connection = sqlite3.connect(Settings.DB_POSTS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()
                cursor.execute("select count(*) from posts")
                totalPosts = cursor.fetchone()[0] or 0
                connection.close()

                connection = sqlite3.connect(Settings.DB_COMMENTS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()
                cursor.execute("select count(*) from comments")
                totalComments = cursor.fetchone()[0] or 0
                connection.close()

                response = make_response(
                    {
                        "payload": {
                            "totalVisitor": totalVisitor,
                            "todaysVisitor": todaysVisitor,
                            "totalPosts": totalPosts,
                            "totalComments": totalComments,
                        }
                    },
                    200,
                )
                response.headers["Cache-Control"] = "no-store"
                return response
            except Exception:
                return make_response({"message": "Unexpected error occured"}, 500)
        else:
            return make_response(
                {"message": "client don't have permission", "error": "request denied"},
                403,
            )
    else:
        return ({"message": "analytics is disabled by admin"}, 410)


@returnPostAnalyticsDataBlueprint.route("/api/v1/postAnalyticsStats")
def return_post_analytics_stats() -> dict:
    """Return counts for post analytics tiles."""

    postID = request.args.get("postID", type=int)

    if Settings.ANALYTICS:
        if "walletAddress" in session and session.get("userRole") == "admin":
            if postID:
                try:
                    connection = sqlite3.connect(Settings.DB_ANALYTICS_ROOT)
                    connection.set_trace_callback(Log.database)
                    cursor = connection.cursor()

                    cursor.execute(
                        "select count(*) from postsAnalytics where postID = ?",
                        (postID,),
                    )
                    totalVisitor = cursor.fetchone()[0] or 0
                    connection.close()

                    todaysVisitorData = getAnalyticsPageTrafficGraphData(
                        postID=postID, hours=24
                    )
                    todaysVisitor = 0
                    for views in todaysVisitorData:
                        todaysVisitor += int(views[1])

                    response = make_response(
                        {
                            "payload": {
                                "totalVisitor": totalVisitor,
                                "todaysVisitor": todaysVisitor,
                            }
                        },
                        200,
                    )
                    response.headers["Cache-Control"] = "no-store"
                    return response
                except Exception:
                    return make_response({"message": "Unexpected error occured"}, 500)
            else:
                return make_response(
                    {
                        "message": "Missing postID; unable to retrieve data.",
                        "error": "postID (type: int) is required.",
                    },
                    404,
                )
        else:
            return make_response(
                {"message": "client don't have permission", "error": "request denied"},
                403,
            )
    else:
        return ({"message": "analytics is disabled by admin"}, 410)


@returnPostAnalyticsDataBlueprint.route("/api/v1/timeSpendsDuration", methods={"POST"})
def storeTimeSpendsDuraton() -> dict:
    """
    This function stores the time spent by a visitor on a post.

    This API updates the `timeSpendDuration` field in the `postsAnalytics` table
    for a given visitor.

    Request Data (JSON):
        `visitorID (int)`: Unique identifier of the visitor.
        `spendTime (int)`: Time spent (in seconds).

    Returns:
        `200 OK`: If the update is successful.
        `500 Internal Server Error`: If an error occurs.
        `405 Method Not Allowed`: If an unsupported HTTP method is used.
    """

    if Settings.ANALYTICS:
        if request.method == "POST":
            visitorData = request.json
            visitorID = visitorData.get("visitorID")
            spendTime = visitorData.get("spendTime")

            try:
                connection = sqlite3.connect(Settings.DB_ANALYTICS_ROOT)
                connection.set_trace_callback(Log.database)
                cursor = connection.cursor()

                cursor.execute(
                    """update postsAnalytics set timeSpendDuration = ? where id = ? """,
                    (spendTime, visitorID),
                )
                connection.commit()
                return make_response({"message": "Successfully upadated"}, 200)
            except Exception:
                return make_response({"message": "Unexpected error occured"}, 500)
        else:
            return make_response({"message": "Method not allowed"}, 405)
    else:
        return ({"message": "analytics is disabled by admin"}, 410)
