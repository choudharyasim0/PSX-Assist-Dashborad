import os
import re
import tempfile
from pathlib import Path

from .config import BASE_DIR, KEY_NAMES

KEY_PATTERN = re.compile(r"[A-Za-z0-9._-]{1,4096}\Z")


def parse_line(line):
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    if line.startswith("export "):
        line = line[7:].lstrip()
    key, separator, value = line.partition("=")
    key = key.strip()
    if not separator or not key:
        return None
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        value = value[1:-1]
    elif " #" in value:
        value = value.split(" #", 1)[0].rstrip()
    if not value or value.lower().startswith("your_"):
        return None
    return key, value


def load(root=BASE_DIR):
    for name in (".env", ".env.example"):
        path = Path(root) / name
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8-sig").splitlines():
            parsed = parse_line(line)
            if parsed:
                key, value = parsed
                if not os.environ.get(key):
                    os.environ[key] = value


def save_keys(updates, root=BASE_DIR):
    if not isinstance(updates, dict) or not updates or any(
        key not in KEY_NAMES
        or not isinstance(value, str)
        or (value.strip() and not KEY_PATTERN.fullmatch(value.strip()))
        for key, value in updates.items()
    ):
        raise ValueError("Invalid API key")
    updates = {
        key: value.strip()
        for key, value in updates.items()
        if value.strip()
    }
    if not updates:
        raise ValueError("At least one API key is required")

    env_path = Path(root) / ".env"
    existing = env_path.read_text(encoding="utf-8-sig").splitlines() if env_path.exists() else []
    remaining = set(updates)
    lines = []
    for line in existing:
        parsed = parse_line(line)
        if parsed and parsed[0] in remaining:
            key = parsed[0]
            lines.append(f"{key}={updates[key]}")
            remaining.remove(key)
        else:
            lines.append(line)
    lines.extend(f"{key}={updates[key]}" for key in remaining)

    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            dir=Path(root),
            prefix=".env.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_file.write("\n".join(lines) + "\n")
            temporary_path = Path(temporary_file.name)
        if os.name != "nt":
            os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, env_path)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()

    for key, value in updates.items():
        os.environ[key] = value
