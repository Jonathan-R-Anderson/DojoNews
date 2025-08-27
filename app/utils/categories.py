import json
from pathlib import Path

from settings import Settings

DEFAULT_CATEGORIES = [
    "Apps",
    "Art",
    "Books",
    "Business",
    "Code",
    "Education",
    "Finance",
    "Foods",
    "Games",
    "Health",
    "History",
    "Movies",
    "Music",
    "Nature",
    "Science",
    "Series",
    "Sports",
    "Technology",
    "Travel",
    "Web",
    "Other",
]


def get_categories():
    """Return the list of allowed categories.

    Categories are stored in a JSON file so that a super user can
    extend the list without modifying the code base. If the file does
    not exist, the default category list is returned.
    """
    path = Path(Settings.DB_CATEGORIES_ROOT)
    if not path.exists():
        return DEFAULT_CATEGORIES
    with path.open("r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            if isinstance(data, list):
                return data
        except Exception:
            pass
    return DEFAULT_CATEGORIES
