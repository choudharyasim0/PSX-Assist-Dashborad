import json
import urllib.parse
from datetime import datetime, timezone

from . import config, proxy

DEFAULT_QUERY = '"Pakistan Stock Exchange" OR "KSE-100" OR KSE100 OR (PSX AND Pakistan)'
MAX_NEWS = 8


class NewsError(Exception):
    pass


def _published(value):
    if not isinstance(value, str):
        return 0
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.timestamp()
    except ValueError:
        return 0


def _is_psx_article(article):
    text = f"{article.get('title', '')} {article.get('description', '')}".casefold()
    pakistan_exchange = any(
        phrase in text
        for phrase in ("pakistan stock exchange", "kse-100", "kse 100", "kse100")
    )
    return pakistan_exchange or ("psx" in text and "pakistan" in text)


def get_news(query=DEFAULT_QUERY):
    if not config.get("GNEWS_API_KEY"):
        raise NewsError("GNews API key server par set nahi hai")
    if not isinstance(query, str) or not query.strip() or len(query) > 200:
        raise ValueError("News search durust nahi hai")
    params = urllib.parse.urlencode(
        {
            "q": query.strip(),
            "lang": "en",
            "max": MAX_NEWS,
            "sortby": "publishedAt",
            "in": "title,description",
        }
    )
    try:
        status, body, _ = proxy.fetch(f"https://gnews.io/api/v4/search?{params}")
    except proxy.ProxyError as error:
        raise NewsError(str(error)) from error
    if not 200 <= status < 300:
        raise NewsError(f"GNews ne HTTP {status} jawab diya")
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise NewsError("GNews ka jawab samajh nahi aaya") from error
    articles = payload.get("articles") if isinstance(payload, dict) else None
    if not isinstance(articles, list):
        raise NewsError("GNews ne durust khabrein nahi bhejeen")
    cleaned = []
    for article in articles:
        if not isinstance(article, dict) or not article.get("title") or not article.get("url"):
            continue
        if not _is_psx_article(article):
            continue
        source = article.get("source") or {}
        if not isinstance(source, dict):
            source = {}
        cleaned.append(
            {
                "title": str(article["title"])[:500],
                "description": str(article.get("description") or "")[:2500],
                "url": str(article["url"])[:2000],
                "publishedAt": article.get("publishedAt"),
                "source": str(source.get("name") or "GNews")[:200],
                "image": str(article.get("image") or "")[:2000],
            }
        )
    cleaned.sort(key=lambda item: _published(item["publishedAt"]), reverse=True)
    return {"articles": cleaned[:MAX_NEWS], "total": len(cleaned)}
