"""
This module contains all the general application settings.
"""

import secrets
import json


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
        REGISTRATION (bool): Toggle user registration feature.
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
    APP_ROOT_PATH = "."
    APP_HOST = "0.0.0.0"
    APP_PORT = 80
    DEBUG_MODE = True

    # Feature Toggles
    LOG_IN = True
    REGISTRATION = True
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
    DB_FOLDER_ROOT = "db/"
    DB_USERS_ROOT = DB_FOLDER_ROOT + "users.db"
    DB_POSTS_ROOT = DB_FOLDER_ROOT + "posts.db"
    DB_COMMENTS_ROOT = DB_FOLDER_ROOT + "comments.db"
    DB_ANALYTICS_ROOT = DB_FOLDER_ROOT + "analytics.db"
    DB_CATEGORIES_ROOT = DB_FOLDER_ROOT + "categories.json"

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
    BLOCKCHAIN_CONTRACTS = {
        "UserRegistry": {
            "address": "0x43E8B0B9D20D0E4E3Ca681670D59c4416244986d",
            "abi": json.loads(
                '''[
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum UserRegistry.Tier",
          "name": "tier",
          "type": "uint8"
        }
      ],
      "name": "TierChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum UserRegistry.Tier",
          "name": "tier",
          "type": "uint8"
        }
      ],
      "name": "UserRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "viewsUsed",
          "type": "uint256"
        }
      ],
      "name": "ViewRecorded",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "enum UserRegistry.Tier",
          "name": "",
          "type": "uint8"
        }
      ],
      "name": "freeQuota",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "recordView",
      "outputs": [
        {
          "internalType": "bool",
          "name": "allowed",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "enum UserRegistry.Tier",
          "name": "tier",
          "type": "uint8"
        }
      ],
      "name": "register",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "resetViews",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "internalType": "enum UserRegistry.Tier",
          "name": "tier",
          "type": "uint8"
        }
      ],
      "name": "setTier",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "sysop",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "users",
      "outputs": [
        {
          "internalType": "enum UserRegistry.Tier",
          "name": "tier",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "freeViewsUsed",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]'''
            ),
        },
        "PostStorage": {
            "address": "0x8f945Cb834788d8a301Da5DAeDe59229Be9F8651",
            "abi": json.loads(
                '''[
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "imageId",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isBlacklisted",
          "type": "bool"
        }
      ],
      "name": "ImageBlacklistUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "imageId",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "magnetURI",
          "type": "string"
        }
      ],
      "name": "ImageMagnetSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "postId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isBlacklisted",
          "type": "bool"
        }
      ],
      "name": "PostBlacklistUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "postId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "author",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "contentHash",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "magnetURI",
          "type": "string"
        }
      ],
      "name": "PostCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "postId",
          "type": "uint256"
        }
      ],
      "name": "PostDeleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "postId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "authorInfo",
          "type": "string"
        }
      ],
      "name": "AuthorInfoUpdated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "blacklistedImages",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "contentHash",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "magnetURI",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "authorInfo",
          "type": "string"
        }
      ],
      "name": "createPost",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "postId",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "postId",
          "type": "uint256"
        }
      ],
      "name": "deletePost",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "imageId",
          "type": "string"
        }
      ],
      "name": "getImage",
      "outputs": [
        {
          "internalType": "string",
          "name": "magnetURI",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "isBlacklisted",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "imageId",
          "type": "string"
        }
      ],
      "name": "getImageMagnet",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "postId",
          "type": "uint256"
        }
      ],
      "name": "getPost",
      "outputs": [
        {
          "components": [
            {
              "internalType": "address",
              "name": "author",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "contentHash",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "magnetURI",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "authorInfo",
              "type": "string"
            },
            {
              "internalType": "bool",
              "name": "exists",
              "type": "bool"
            },
            {
              "internalType": "bool",
              "name": "blacklisted",
              "type": "bool"
            }
          ],
          "internalType": "struct PostStorage.Post",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "imageMagnets",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextPostId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "posts",
      "outputs": [
        {
          "internalType": "address",
          "name": "author",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "contentHash",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "magnetURI",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "authorInfo",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "blacklisted",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "postId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isBlacklisted",
          "type": "bool"
        }
      ],
      "name": "setBlacklist",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "imageId",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "isBlacklisted",
          "type": "bool"
        }
      ],
      "name": "setImageBlacklist",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "postId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "authorInfo",
          "type": "string"
        }
      ],
      "name": "updateAuthorInfo",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "imageId",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "magnetURI",
          "type": "string"
        }
      ],
      "name": "setImageMagnet",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "sysop",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]'''
            ),
        },
        "CommentStorage": {
            "address": "0x99DA839de05C2c9d97FAA742b85C50AC75d875f3",
            "abi": json.loads(
                '''[
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "uint256", "name": "commentId", "type": "uint256"},
        {"indexed": true, "internalType": "uint256", "name": "postId", "type": "uint256"},
        {"indexed": true, "internalType": "address", "name": "author", "type": "address"},
        {"indexed": false, "internalType": "string", "name": "content", "type": "string"}
      ],
      "name": "CommentAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "uint256", "name": "commentId", "type": "uint256"}
      ],
      "name": "CommentDeleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {"indexed": true, "internalType": "uint256", "name": "commentId", "type": "uint256"},
        {"indexed": false, "internalType": "bool", "name": "isBlacklisted", "type": "bool"}
      ],
      "name": "CommentBlacklistUpdated",
      "type": "event"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "postId", "type": "uint256"},
        {"internalType": "string", "name": "content", "type": "string"}
      ],
      "name": "addComment",
      "outputs": [
        {"internalType": "uint256", "name": "commentId", "type": "uint256"}
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "commentId", "type": "uint256"}
      ],
      "name": "deleteComment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "commentId", "type": "uint256"},
        {"internalType": "bool", "name": "isBlacklisted", "type": "bool"}
      ],
      "name": "setBlacklist",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "commentId", "type": "uint256"}
      ],
      "name": "getComment",
      "outputs": [
        {
          "components": [
            {"internalType": "address", "name": "author", "type": "address"},
            {"internalType": "uint256", "name": "postId", "type": "uint256"},
            {"internalType": "string", "name": "content", "type": "string"},
            {"internalType": "bool", "name": "exists", "type": "bool"},
            {"internalType": "bool", "name": "blacklisted", "type": "bool"}
          ],
          "internalType": "struct CommentStorage.Comment",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextCommentId",
      "outputs": [
        {"internalType": "uint256", "name": "", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {"internalType": "uint256", "name": "", "type": "uint256"}
      ],
      "name": "comments",
      "outputs": [
        {"internalType": "address", "name": "author", "type": "address"},
        {"internalType": "uint256", "name": "postId", "type": "uint256"},
        {"internalType": "string", "name": "content", "type": "string"},
        {"internalType": "bool", "name": "exists", "type": "bool"},
        {"internalType": "bool", "name": "blacklisted", "type": "bool"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "sysop",
      "outputs": [
        {"internalType": "address", "name": "", "type": "address"}
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]'''
            ),
        },
        "TipJar": {
            "address": "0xe30778dcAB70d1e8D25208f851bA54B1c7691c7a",
            "abi": json.loads(
                '''[
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "author",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "postId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "sysopFee",
          "type": "uint256"
        }
      ],
      "name": "TipSent",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "bps",
          "type": "uint256"
        }
      ],
      "name": "setSysopTipBps",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "sysop",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "sysopTipBps",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "author",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "postId",
          "type": "bytes32"
        }
      ],
      "name": "tip",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "tips",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]'''
            ),
        },
        "SponsorSlots": {
            "address": "0x0000000000000000000000000000000000000000",
            "abi": [],
        },
    }
