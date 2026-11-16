import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = BASE_DIR / "web"
KEY_NAMES = ("GEMINI_API_KEY", "GROQ_API_KEY", "GNEWS_API_KEY")
DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"
DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"
AI_TIMEOUT = 45
AI_RATE_LIMIT = (10, 60)
MAX_BODY = 64 * 1024
MAX_PROMPT_CHARS = 50_000
APP_VERSION = "1.0.0"


def get(name, default=""):
    return os.environ.get(name, default).strip()


def on_hf():
    return bool(get("SPACE_ID"))


def host():
    return get("HOST", "0.0.0.0" if on_hf() else "127.0.0.1")


def port():
    return int(get("PORT", "7860" if on_hf() else "8000"))
