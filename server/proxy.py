import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

from . import config

ALLOWED_HOSTS = {"dps.psx.com.pk", "gnews.io"}
MAX_RESPONSE_BYTES = 5 * 1024 * 1024
_PSX_TOKEN_PATTERN = re.compile(r"window\.__ps\s*=\s*(\{.*?\})\s*;", re.DOTALL)
_PSX_TOKEN_TTL = 60
_psx_token = ""
_psx_token_at = 0.0
_psx_token_lock = threading.Lock()


class ProxyError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


class _SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, new_url):
        if not is_allowed(new_url):
            raise urllib.error.HTTPError(
                request.full_url,
                code,
                "Redirect destination is not allowed",
                headers,
                response,
            )
        return super().redirect_request(request, response, code, message, headers, new_url)


def is_allowed(url):
    try:
        parsed = urllib.parse.urlsplit(url)
        return (
            parsed.scheme == "https"
            and parsed.hostname in ALLOWED_HOSTS
            and parsed.username is None
            and parsed.password is None
            and parsed.port in (None, 443)
        )
    except ValueError:
        return False


def _with_server_key(url):
    parsed = urllib.parse.urlsplit(url)
    headers = {
        "User-Agent": "PSX-Assist-Dashboard/1.0",
        "Accept": "application/json, text/javascript, */*; q=0.01",
    }
    key = config.get("GNEWS_API_KEY")
    if parsed.hostname == "gnews.io" and key:
        params = [
            (name, value)
            for name, value in urllib.parse.parse_qsl(parsed.query)
            if name != "apikey"
        ]
        params.append(("apikey", key))
        parsed = parsed._replace(query=urllib.parse.urlencode(params))
    if parsed.hostname == "dps.psx.com.pk" and parsed.path != "/":
        headers.update(
            {
                "Referer": "https://dps.psx.com.pk/",
                "X-Requested-With": "XMLHttpRequest",
                "X-Req-Id": _psx_request_id(),
            }
        )
    return urllib.parse.urlunsplit(parsed), headers


def _psx_request_id(force_refresh=False):
    global _psx_token, _psx_token_at
    with _psx_token_lock:
        if not force_refresh and _psx_token and time.monotonic() - _psx_token_at < _PSX_TOKEN_TTL:
            return _psx_token
        request = urllib.request.Request(
            "https://dps.psx.com.pk/",
            headers={"User-Agent": "PSX-Assist-Dashboard/1.0"},
        )
        opener = urllib.request.build_opener(_SafeRedirectHandler())
        try:
            with opener.open(request, timeout=20) as response:
                body = response.read(256 * 1024).decode("utf-8", "replace")
        except (urllib.error.URLError, TimeoutError) as error:
            raise ProxyError("PSX portal se rabta nahi ho saka") from error
        match = _PSX_TOKEN_PATTERN.search(body)
        if not match:
            raise ProxyError("PSX portal ka request token nahi mila")
        try:
            token = json.loads(match.group(1)).get("_k")
        except (json.JSONDecodeError, AttributeError) as error:
            raise ProxyError("PSX portal ka request token durust nahi") from error
        if not isinstance(token, str) or not token:
            raise ProxyError("PSX portal ka request token khaali hai")
        _psx_token, _psx_token_at = token, time.monotonic()
        return token


def _invalidate_psx_request_id(token):
    global _psx_token, _psx_token_at
    with _psx_token_lock:
        if _psx_token == token:
            _psx_token, _psx_token_at = "", 0.0


def fetch(url):
    if not is_allowed(url):
        raise ProxyError("Yeh address allowed nahi hai", 403)
    parsed = urllib.parse.urlsplit(url)
    secret = config.get("GNEWS_API_KEY").encode("utf-8") if parsed.hostname == "gnews.io" else b""
    for attempt in range(2):
        request_url, headers = _with_server_key(url)
        request = urllib.request.Request(request_url, headers=headers)
        opener = urllib.request.build_opener(_SafeRedirectHandler())
        try:
            with opener.open(request, timeout=20) as response:
                body = response.read(MAX_RESPONSE_BYTES + 1)
                if len(body) > MAX_RESPONSE_BYTES:
                    raise ProxyError("Response bohat bari hai", 502)
                if secret:
                    body = body.replace(secret, b"[redacted]")
                return response.status, body, response.headers.get_content_type()
        except urllib.error.HTTPError as error:
            if parsed.hostname == "dps.psx.com.pk" and error.code == 403 and attempt == 0:
                _invalidate_psx_request_id(headers.get("X-Req-Id", ""))
                continue
            body = error.read(MAX_RESPONSE_BYTES + 1)
            if len(body) > MAX_RESPONSE_BYTES:
                body = body[:MAX_RESPONSE_BYTES]
            if secret:
                body = body.replace(secret, b"[redacted]")
            return error.code, body, error.headers.get_content_type()
        except (urllib.error.URLError, TimeoutError) as error:
            raise ProxyError("Data source tak pohanch nahi saka") from error
