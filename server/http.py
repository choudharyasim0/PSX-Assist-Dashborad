import ipaddress
import json
import mimetypes
import urllib.parse
from http.server import BaseHTTPRequestHandler

from . import ai, auth, config, envfile, news, proxy, psx

LIMITER = ai.RateLimiter(*config.AI_RATE_LIMIT)
TEXT_TYPES = {".js": "text/javascript", ".css": "text/css", ".html": "text/html"}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def send_bytes(self, code, body, content_type):
        self.send_response(code)
        self.send_header(
            "Content-Type",
            content_type + ("; charset=utf-8" if content_type.startswith("text/") else ""),
        )
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, code, data):
        self.send_bytes(code, json.dumps(data).encode(), "application/json")

    def authorized(self):
        return auth.is_authorized(
            self.headers.get("Authorization", ""),
            config.get("APP_PASSWORD"),
        )

    def deny(self):
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="PSX Assist"')
        self.send_header("Content-Length", "0")
        self.end_headers()

    def read_json(self, limit):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if not 0 < length <= limit:
            self.send_json(413, {"error": "Request khali ya bohat bari hai"})
            return None
        try:
            data = json.loads(self.rfile.read(length))
        except (UnicodeDecodeError, json.JSONDecodeError):
            data = None
        if not isinstance(data, dict):
            self.send_json(400, {"error": "Request ka format theek nahi"})
            return None
        return data

    def do_GET(self):
        url = urllib.parse.urlsplit(self.path)
        if url.path == "/healthz":
            return self.send_bytes(200, b"ok", "text/plain")
        if not self.authorized():
            return self.deny()
        if url.path == "/api/config":
            status = {name: bool(config.get(name)) for name in config.KEY_NAMES}
            return self.send_json(
                200,
                {
                    "keys": status,
                    "tempDisk": config.on_hf(),
                    "version": config.APP_VERSION,
                    "host": config.host(),
                    "port": config.port(),
                },
            )
        if url.path == "/api/psx/symbols":
            return self.send_json(200, psx.symbols_or_fallback())
        if url.path == "/api/psx/quote":
            query = urllib.parse.parse_qs(url.query)
            symbol = query.get("symbol", [""])[0].strip().upper()
            period = query.get("period", ["int"])[0]
            if not psx.valid_symbol(symbol):
                return self.send_json(400, {"error": "Share ka symbol durust nahi hai"})
            try:
                return self.send_json(200, psx.get_quote(symbol, period))
            except ValueError as error:
                return self.send_json(400, {"error": str(error)})
            except psx.PSXError as error:
                return self.send_json(502, {"error": str(error)})
        if url.path == "/api/psx/series":
            query = urllib.parse.parse_qs(url.query)
            symbol = query.get("symbol", [""])[0].strip().upper()
            period = query.get("period", ["int"])[0]
            if not psx.valid_symbol(symbol):
                return self.send_json(400, {"error": "Share ka symbol durust nahi hai"})
            try:
                return self.send_json(
                    200,
                    {"symbol": symbol, "period": period, "series": psx.get_series(symbol, period)},
                )
            except ValueError as error:
                return self.send_json(400, {"error": str(error)})
            except psx.PSXError as error:
                return self.send_json(502, {"error": str(error)})
        if url.path == "/api/news":
            query = urllib.parse.parse_qs(url.query).get("q", [news.DEFAULT_QUERY])[0]
            try:
                return self.send_json(200, news.get_news(query))
            except ValueError as error:
                return self.send_json(400, {"error": str(error)})
            except news.NewsError as error:
                status = 503 if "API key" in str(error) else 502
                return self.send_json(status, {"error": str(error)})
        if url.path == "/proxy":
            return self.handle_proxy(
                urllib.parse.parse_qs(url.query).get("url", [""])[0]
            )
        self.serve_static(url.path)

    def handle_proxy(self, target):
        if not proxy.is_allowed(target):
            return self.send_json(403, {"error": "Yeh address allowed nahi hai"})
        try:
            self.send_bytes(*proxy.fetch(target))
        except proxy.ProxyError as error:
            self.send_json(error.status, {"error": str(error)})

    def serve_static(self, path):
        root = config.WEB_DIR.resolve()
        target = (root / ("index.html" if path == "/" else path.lstrip("/"))).resolve()
        if root not in target.parents or not target.is_file():
            return self.send_json(404, {"error": "Nahi mila"})
        content_type = (
            TEXT_TYPES.get(target.suffix)
            or mimetypes.guess_type(target.name)[0]
            or "application/octet-stream"
        )
        self.send_bytes(200, target.read_bytes(), content_type)

    def do_POST(self):
        if not self.authorized():
            return self.deny()
        path = urllib.parse.urlsplit(self.path).path
        if path == "/api/ai":
            return self.handle_ai()
        if path == "/api/save-keys":
            return self.handle_save_keys()
        self.send_json(404, {"error": "Nahi mila"})

    def handle_ai(self):
        if not LIMITER.allow(self.client_address[0]):
            return self.send_json(
                429,
                {"error": "Bohat zyada requests hain, thori der baad koshish karein"},
            )
        data = self.read_json(config.MAX_BODY)
        if data is None:
            return
        prompt, wants_json = data.get("prompt"), data.get("json", False)
        language = data.get("language", "roman")
        if (
            not isinstance(prompt, str)
            or not prompt.strip()
            or len(prompt) > config.MAX_PROMPT_CHARS
            or not isinstance(wants_json, bool)
            or language not in ai.SUPPORTED_LANGUAGES
        ):
            return self.send_json(400, {"error": "Sawal khali ya theek nahi hai"})
        try:
            self.send_json(200, ai.generate(prompt, wants_json, language))
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
        except ai.NoKeysError as error:
            self.send_json(503, {"error": str(error)})
        except ai.ProviderError as error:
            self.send_json(502, {"error": str(error)})

    def is_local_request(self):
        try:
            loopback = ipaddress.ip_address(self.client_address[0]).is_loopback
        except ValueError:
            return False
        host = urllib.parse.urlsplit("//" + self.headers.get("Host", "")).hostname
        origin = self.headers.get("Origin")
        origin_ok = origin is None or urllib.parse.urlsplit(origin).hostname == host
        return loopback and origin_ok and host in ("localhost", "127.0.0.1", "::1")

    def handle_save_keys(self):
        if not (config.get("APP_PASSWORD") or self.is_local_request()):
            return self.send_json(
                403,
                {"error": "Keys sirf isi computer se ya password ke saath save hoti hain"},
            )
        data = self.read_json(16 * 1024)
        if data is None:
            return
        try:
            envfile.save_keys(
                {name: data.get(name, "") for name in config.KEY_NAMES}
            )
        except ValueError:
            return self.send_json(400, {"error": "Key ka format theek nahi ya koi key nahi di"})
        except OSError:
            return self.send_json(500, {"error": ".env file save nahi ho saki"})
        self.send_json(200, {"saved": True})
