"""
This module contains all the general application settings.
"""

import secrets
import json
from pathlib import Path


class Settings:
    """
    Configuration settings for the Flask Blog application.

    Attributes:
        APP_NAME (str): Name of the Flask application.
        APP_VERSION (str): Version of the Flask application.
        APP_ROOT_PATH (str): Path to the root of the application files.
        APP_HOST (str): Hostname or IP address for the Flask application.
        APP_PORT (int): Port number for the Flask application.
        DEBUG_MODE (bool): Toggle debug mode for the Flask application.
        LOG_IN (bool): Toggle user login feature.
        LANGUAGES (list): Supported languages for the application.
        ANALYTICS (bool): Enable or disable analytics feature for posts.
        TAMGA_LOGGER (bool): Toggle custom logging feature.
        WERKZEUG_LOGGER (bool): Toggle werkzeug logging feature.
        LOG_TO_FILE (bool): Toggle logging to file feature.
        LOG_FOLDER_ROOT (str): Root path of the log folder.
        LOG_FILE_ROOT (str): Root path of the log file.
        BREAKER_TEXT (str): Separator text used in log files.
        APP_SECRET_KEY (str): Secret key for Flask sessions.
        SESSION_PERMANENT (bool): Toggle permanent sessions for the Flask application.
        DB_FOLDER_ROOT (str): Root path of the database folder.
        DB_USERS_ROOT (str): Root path of the users database.
        DB_POSTS_ROOT (str): Root path of the posts database.
        DB_COMMENTS_ROOT (str): Root path of the comments database.
        DB_ANALYTICS_ROOT (str): Root path of the analytics database.
        DB_CATEGORIES_ROOT (str): Root path of the categories configuration file.
        DB_BLACKLIST_ROOT (str): Root path of the blacklist database.
        SMTP_SERVER (str): SMTP server address.
        SMTP_PORT (int): SMTP server port.
        SMTP_MAIL (str): SMTP mail address.
        SMTP_PASSWORD (str): SMTP mail password.
        DEFAULT_ADMIN (bool): Toggle creation of default admin account.
        DEFAULT_ADMIN_USERNAME (str): Default admin username.
        DEFAULT_ADMIN_EMAIL (str): Default admin email address.
        DEFAULT_ADMIN_PASSWORD (str): Default admin password.
        DEFAULT_ADMIN_POINT (int): Default starting point score for admin.
        DEFAULT_ADMIN_PROFILE_PICTURE (str): Default admin profile picture URL.
        RECAPTCHA (bool): Toggle reCAPTCHA verification.
        RECAPTCHA_SITE_KEY (str): reCAPTCHA site key.
        RECAPTCHA_SECRET_KEY (str): reCAPTCHA secret key.
        RECAPTCHA_VERIFY_URL (str): reCAPTCHA verify URL.
    """

    # Application Configuration
    APP_NAME = "flaskBlog"
    APP_VERSION = "3.0.0dev"
    # Determine the repository root to consistently store uploaded files
    APP_ROOT_PATH = str(Path(__file__).resolve().parent.parent)
    APP_HOST = "0.0.0.0"
    APP_PORT = 80
    DEBUG_MODE = True

    # Feature Toggles
    LOG_IN = True
    ANALYTICS = True

    # Internationalization
    LANGUAGES = ["en", "tr", "es", "de", "zh", "fr", "uk", "ru", "pt", "ja", "pl", "hi"]

    # Theme Configuration
    THEMES = [
        "light",
        "dark",
        "cupcake",
        "bumblebee",
        "emerald",
        "corporate",
        "synthwave",
        "retro",
        "cyberpunk",
        "valentine",
        "halloween",
        "garden",
        "forest",
        "aqua",
        "lofi",
        "pastel",
        "fantasy",
        "wireframe",
        "black",
        "luxury",
        "dracula",
        "cmyk",
        "autumn",
        "business",
        "acid",
        "lemonade",
        "night",
        "coffee",
        "winter",
        "dim",
        "nord",
        "sunset",
        "caramellatte",
        "abyss",
        "silk",
    ]

    # Logging Configuration
    TAMGA_LOGGER = True
    WERKZEUG_LOGGER = False
    LOG_TO_FILE = True
    LOG_FOLDER_ROOT = "log/"
    LOG_FILE_ROOT = LOG_FOLDER_ROOT + "log.log"
    BREAKER_TEXT = "\n"

    # Session Configuration
    APP_SECRET_KEY = secrets.token_urlsafe(32)
    SESSION_PERMANENT = True

    # Database Configuration
    _DB_PATH = Path(__file__).resolve().parent / "db"
    DB_FOLDER_ROOT = str(_DB_PATH)
    DB_USERS_ROOT = str(_DB_PATH / "users.db")
    DB_POSTS_ROOT = str(_DB_PATH / "posts.db")
    DB_COMMENTS_ROOT = str(_DB_PATH / "comments.db")
    DB_ANALYTICS_ROOT = str(_DB_PATH / "analytics.db")
    DB_CATEGORIES_ROOT = str(_DB_PATH / "categories.json")
    DB_BLACKLIST_ROOT = str(_DB_PATH / "blacklist.db")
    BLACKLIST_API_HOST = "blacklist"
    BLACKLIST_API_PORT = 5001

    # SMTP Mail Configuration
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SMTP_MAIL = "flaskblogdogukanurker@gmail.com"
    SMTP_PASSWORD = "lsooxsmnsfnhnixy"

    # Default Admin Account Configuration
    DEFAULT_ADMIN = True
    DEFAULT_ADMIN_USERNAME = "admin"
    DEFAULT_ADMIN_EMAIL = "admin@flaskblog.com"
    DEFAULT_ADMIN_PASSWORD = "admin"
    DEFAULT_ADMIN_POINT = 0
    DEFAULT_ADMIN_PROFILE_PICTURE = f"https://api.dicebear.com/7.x/identicon/svg?seed={DEFAULT_ADMIN_USERNAME}&radius=10"

    # reCAPTCHA Configuration
    RECAPTCHA = False
    RECAPTCHA_SITE_KEY = ""
    RECAPTCHA_SECRET_KEY = ""
    RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"

    # Blockchain Configuration
    BLOCKCHAIN_RPC_URL = "https://mainnet.era.zksync.io"
    BLOCKCHAIN_ABI = []
    ADMIN_WALLET_ADDRESS = "0xB2b36AaD18d7be5d4016267BC4cCec2f12a64b6e"
    # Addresses and ABIs for individual smart contracts managed by the sysop
    ABI_PATH = Path(__file__).resolve().parent / "abi"

    @staticmethod
    def _load_abi(file_name: str):
        """Return the ABI list from ``file_name`` regardless of artifact format."""
        path = Path(__file__).resolve().parent / "abi" / file_name
        data = json.loads(path.read_text())
        return data.get("abi", data) if isinstance(data, dict) else data

    BLOCKCHAIN_CONTRACTS = {
        "Board": {
            "address": "0xe20Ba14058a6De592Ff9309A2B0D3B1c7cD18FB8",
            "abi": _load_abi("Board.json"),
        },
        "Posts": {
            "address": "0xD594bf9FcfC4dD9A6dA8f65D5E29D9f71302a34E",
            "abi": _load_abi("Posts.json"),
        },
        "Comments": {
            "address": "0x22EBB7E5Fa8b5E03f19F68f7F3925Bf84166F656",
            "abi": _load_abi("Comments.json"),
        },
        "PostStorage": {
            "address": "0x1785Fa13F4b1cA4e512dBa71e213c86D0E019c91",
            "abi": _load_abi("PostStorage.json"),
        },
        "CommentStorage": {
            "address": "0xCdB9Abfe1E5cc4Fba0E242F78Ddb0B37F85E5077",
            "abi": _load_abi("CommentStorage.json"),
        },
        "Moderation": {
            "address": "0x3D44eE9487Bf815Fe9c0F619F415FDc32afb4170",
            "abi": _load_abi("Moderation.json"),
        },
        "SponsorSlots": {
            "address": "0x4c01F8E45a0523e4B2f485dF47D35f7803e46f4D",
            "abi": _load_abi("SponsorSlots.json"),
        },
        "TipJar": {
            "address": "0x2c99CD9A504E01bb0d68540446B57c9582456931",
            "abi": _load_abi("TipJar.json"),
        },
    }

    # Words on the board that should be filtered in posts and comments
    BOARD_WORD_FILTERS = {
        "badword": "[censored]",
    }
