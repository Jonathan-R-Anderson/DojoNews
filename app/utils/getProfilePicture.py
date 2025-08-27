import sqlite3

from settings import Settings
from utils.log import Log


def getProfilePicture(userName):
    """
    Returns the profile picture of the user with the specified username.

    Parameters:
        userName (str): The username of the user whose profile picture is to be retrieved.

    Returns:
        str: The profile picture URL of the user. If no picture is stored in the
        database, a DiceBear identicon URL is generated as a fallback.
    """
    Log.database(f"Connecting to '{Settings.DB_USERS_ROOT}' database")

    connection = sqlite3.connect(Settings.DB_USERS_ROOT)
    connection.set_trace_callback(Log.database)

    cursor = connection.cursor()

    cursor.execute(
        """select profilePicture from users where lower(userName) = ? """,
        [(userName.lower())],
    )
    try:
        profilePicture = cursor.fetchone()[0]
        Log.info(f"Returning {userName}'s profile picture: {profilePicture}")
    except Exception:
        profilePicture = None
        Log.error(f"Failed to retrieve profile picture for user: {userName}")

    # Fallback to DiceBear identicon service if no profile picture is set
    if not profilePicture:
        Log.info(
            f"No profile picture found for {userName}, using DiceBear identicon service"
        )
        profilePicture = (
            f"https://api.dicebear.com/7.x/identicon/svg?seed={userName}&radius=10"
        )

    return profilePicture
