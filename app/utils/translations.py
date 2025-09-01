from json import load
from pathlib import Path

from utils.log import Log


def loadTranslations(language):
    """
    Load the translations for the specified language.

    Parameters:
        language (str): The language code for the translations to be loaded.

    Returns:
        dict: A dictionary containing the translations for the specified language.
    """

    # Determine the path to the translations directory relative to this file
    translations_dir = Path(__file__).resolve().parent.parent / "translations"
    translationFile = translations_dir / f"{language}.json"
    if translationFile.exists():
        with open(translationFile, "r", encoding="utf-8") as file:
            translations = load(file)
            Log.info(f"Loaded translations for language: {language}")
            return translations
    Log.warning(f"Translation file not found: {language}")
    return {}
