import json
import re
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from . import proxy

SYMBOL_PATTERN = re.compile(r"[A-Z0-9][A-Z0-9.-]{0,19}\Z")
SYMBOLS_URL = "https://dps.psx.com.pk/symbols"
INDEX_SYMBOLS = ("KSE100", "KSE30", "KMI30", "ALLSHR", "KMIALLSHR")
FALLBACK_SYMBOLS = [
    {"symbol": symbol, "name": symbol, "type": "index"}
    for symbol in INDEX_SYMBOLS
] + [
    {"symbol": symbol, "name": symbol, "type": "stock"}
    for symbol in ("OGDC", "HUBC", "LUCK", "FFC", "HBL", "MEBL", "SYS", "PSO")
]


class PSXError(Exception):
    pass


def valid_symbol(symbol):
    return isinstance(symbol, str) and bool(SYMBOL_PATTERN.fullmatch(symbol.upper()))


def _payload(url):
    try:
        status, body, _ = proxy.fetch(url)
    except proxy.ProxyError as error:
        raise PSXError(str(error)) from error
    if not 200 <= status < 300:
        raise PSXError(f"PSX data service ne HTTP {status} jawab diya")
    try:
        return json.loads(body.decode("utf-8-sig"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise PSXError("PSX data ka format samajh nahi aaya") from error


def _rows(payload):
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    for key in ("data", "items", "symbols", "results", "series", "dataRows"):
        value = payload.get(key)
        if isinstance(value, list):
            return value
    return []


def _symbol_item(item):
    if not isinstance(item, dict):
        return None
    symbol = next(
        (item.get(key) for key in ("symbol", "code", "sym", "nameSymbol") if item.get(key)),
        None,
    )
    if not isinstance(symbol, str) or not valid_symbol(symbol):
        return None
    name = next(
        (
            item.get(key)
            for key in ("company", "companyName", "name", "longName", "securityName")
            if isinstance(item.get(key), str) and item.get(key).strip()
        ),
        symbol,
    )
    result = {"symbol": symbol.upper(), "name": name.strip(), "type": "stock"}
    sector = item.get("sectorName")
    if isinstance(sector, str) and sector.strip():
        result["sector"] = sector.strip()
    return result


def get_symbols():
    payload = _payload(SYMBOLS_URL)
    items = [_symbol_item(item) for item in _rows(payload)]
    items = [item for item in items if item]
    if not items:
        raise PSXError("PSX symbols ki list khaali ya ghair-motabar hai")
    listed = {item["symbol"] for item in items}
    items.extend(
        {"symbol": symbol, "name": symbol, "type": "index"}
        for symbol in INDEX_SYMBOLS
        if symbol not in listed
    )
    for item in items:
        if item["symbol"] in INDEX_SYMBOLS:
            item["type"] = "index"
    return {"items": items, "fallback": False}


def symbols_or_fallback():
    try:
        return get_symbols()
    except PSXError as error:
        return {
            "items": FALLBACK_SYMBOLS,
            "fallback": True,
            "message": str(error),
        }


def _timestamp(value):
    if isinstance(value, (int, float)):
        stamp = int(value)
        return stamp if stamp > 100_000_000_000 else stamp * 1000
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            return int(parsed.timestamp() * 1000)
        except ValueError:
            try:
                return _timestamp(float(value))
            except ValueError:
                return None
    return None


def _number(value):
    try:
        number = float(value)
        return number if number == number and abs(number) != float("inf") else None
    except (TypeError, ValueError):
        return None


def normalize_records(payload):
    rows = _rows(payload)
    result = []
    for row in rows:
        if isinstance(row, dict):
            timestamp = next(
                (row.get(key) for key in ("timestamp", "time", "date", "ts", "x") if row.get(key) is not None),
                None,
            )
            close = next(
                (row.get(key) for key in ("close", "price", "value", "closePrice", "y") if row.get(key) is not None),
                None,
            )
            high = next((row.get(key) for key in ("high", "dayHigh") if row.get(key) is not None), None)
            low = next((row.get(key) for key in ("low", "dayLow") if row.get(key) is not None), None)
            volume = next((row.get(key) for key in ("volume", "vol") if row.get(key) is not None), None)
        elif isinstance(row, (list, tuple)) and len(row) >= 2:
            timestamp = row[0]
            if len(row) == 3:
                close, high, low, volume = row[1], None, None, row[2]
            elif len(row) == 4:
                close, high, low, volume = row[1], None, None, row[2]
            else:
                close = row[4] if len(row) >= 5 else row[1]
                high = row[2] if len(row) >= 5 else None
                low = row[3] if len(row) >= 5 else None
                volume = row[5] if len(row) >= 6 else None
        else:
            continue
        stamp, price = _timestamp(timestamp), _number(close)
        if stamp is None or price is None:
            continue
        result.append(
            {
                "time": stamp,
                "price": price,
                "high": _number(high),
                "low": _number(low),
                "volume": _number(volume),
            }
        )
    result.sort(key=lambda item: item["time"])
    return result


def get_series(symbol, period="int"):
    symbol = symbol.upper()
    if not valid_symbol(symbol):
        raise ValueError("Symbol durust nahi hai")
    if period not in ("int", "eod"):
        raise ValueError("Chart ka waqt durust nahi hai")
    url = f"https://dps.psx.com.pk/timeseries/{period}/{symbol}"
    rows = normalize_records(_payload(url))
    if not rows:
        raise PSXError("Is symbol ka chart data dastiyab nahi hai")
    return rows


def get_quote(symbol, period="int"):
    if period not in ("int", "eod"):
        raise ValueError("Chart ka waqt durust nahi hai")
    used_eod_fallback = False
    if period == "eod":
        rows = get_series(symbol, "eod")
    else:
        try:
            rows = get_series(symbol, "int")
        except PSXError:
            rows = get_series(symbol, "eod")
            used_eod_fallback = True
    latest = rows[-1]
    price = latest["price"]
    pakistan_timezone = ZoneInfo("Asia/Karachi")
    latest_date = datetime.fromtimestamp(
        latest["time"] / 1000, timezone.utc
    ).astimezone(pakistan_timezone).date()
    if period == "eod" or used_eod_fallback:
        previous = rows[-2] if len(rows) > 1 else None
        high, low = latest["high"], latest["low"]
        volume = latest["volume"]
    else:
        session_rows = [
            row for row in rows
            if datetime.fromtimestamp(row["time"] / 1000, timezone.utc)
            .astimezone(pakistan_timezone).date() == latest_date
        ]
        high = max((row["price"] for row in session_rows), default=None)
        low = min((row["price"] for row in session_rows), default=None)
        volumes = [row["volume"] for row in session_rows if row["volume"] is not None]
        volume = sum(volumes) if volumes else None
        previous = None
        try:
            eod_rows = get_series(symbol, "eod")
            previous = next(
                (
                    row for row in reversed(eod_rows)
                    if datetime.fromtimestamp(row["time"] / 1000, timezone.utc)
                    .astimezone(pakistan_timezone).date() < latest_date
                ),
                None,
            )
        except PSXError:
            pass
    change = price - previous["price"] if previous else None
    now = datetime.now(pakistan_timezone)
    age_seconds = max(0, now.timestamp() - latest["time"] / 1000)
    if latest_date < now.date():
        source_status = "market_closed"
    elif period == "int" and not used_eod_fallback and age_seconds <= 120:
        source_status = "live"
    else:
        source_status = "delayed"
    return {
        "symbol": symbol.upper(),
        "price": price,
        "change": change,
        "changePercent": change / previous["price"] * 100 if previous and previous["price"] else None,
        "high": high,
        "low": low,
        "volume": volume,
        "updatedAt": latest["time"],
        "series": rows,
        "source": "PSX Data Portal",
        "status": source_status,
        "pricePeriod": "eod" if period == "eod" or used_eod_fallback else "int",
    }
