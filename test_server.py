import base64
import http.client
import io
import json
import os
import tempfile
import threading
import unittest
import urllib.error
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

from server import ai, auth, envfile, news, proxy, psx
from server.http import Handler


class EnvFileTests(unittest.TestCase):
    def test_parse_line(self):
        p = envfile.parse_line
        self.assertEqual(p("export A='x y'"), ("A", "x y"))
        self.assertEqual(p('B="q"'), ("B", "q"))
        self.assertEqual(p("C=abc # note"), ("C", "abc"))
        for bad in ("# c", "", "D=", "E=your_key_here", "nokey"):
            self.assertIsNone(p(bad))

    def test_load_order_and_save(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.dict(os.environ, {"GROQ_API_KEY": "real"}, clear=False):
            os.environ.pop("GEMINI_API_KEY", None)
            root = Path(d)
            (root / ".env").write_text("GEMINI_API_KEY=fromenv\nGROQ_API_KEY=fromfile\n")
            (root / ".env.example").write_text("GEMINI_API_KEY=fromexample\n")
            envfile.load(root)
            self.assertEqual(os.environ["GEMINI_API_KEY"], "fromenv")
            self.assertEqual(os.environ["GROQ_API_KEY"], "real")
            (root / ".env").write_text("# keep me\nGEMINI_API_KEY=old\nOTHER=1\n")
            envfile.save_keys({"GEMINI_API_KEY": "new1", "GROQ_API_KEY": ""}, root)
            self.assertEqual((root / ".env").read_text(), "# keep me\nGEMINI_API_KEY=new1\nOTHER=1\n")
            for bad in ({"GEMINI_API_KEY": "a\nB=c"}, {"EVIL": "x"}, {}):
                with self.assertRaises(ValueError):
                    envfile.save_keys(bad, root)
            os.environ.pop("GEMINI_API_KEY", None)


class UnitTests(unittest.TestCase):
    def test_auth(self):
        good = "Basic " + base64.b64encode(b"u:pw").decode()
        self.assertTrue(auth.is_authorized("", ""))
        self.assertTrue(auth.is_authorized(good, "pw"))
        self.assertFalse(auth.is_authorized(good, "other"))
        self.assertFalse(auth.is_authorized("Basic !!!", "pw"))

    def test_proxy_allow_list(self):
        ok = ["https://dps.psx.com.pk/symbols", "https://gnews.io/api/v4/search?q=x"]
        bad = ["http://dps.psx.com.pk/symbols", "https://evil.com/", "https://dps.psx.com.pk@evil.com/",
               "https://dps.psx.com.pk.evil.com/", "https://dps.psx.com.pk:8443/", "file:///etc/passwd"]
        self.assertTrue(all(proxy.is_allowed(u) for u in ok))
        self.assertFalse(any(proxy.is_allowed(u) for u in bad))

    def test_gnews_key_replaced(self):
        with mock.patch.dict(os.environ, {"GNEWS_API_KEY": "SRV"}):
            url, _ = proxy._with_server_key("https://gnews.io/api/v4/search?q=a&apikey=BROWSER")
        self.assertIn("apikey=SRV", url)
        self.assertNotIn("BROWSER", url)

    def test_psx_request_header_uses_bootstrap_id(self):
        with mock.patch.object(proxy, "_psx_request_id", return_value="request-id"):
            url, headers = proxy._with_server_key("https://dps.psx.com.pk/symbols")
        self.assertEqual(url, "https://dps.psx.com.pk/symbols")
        self.assertEqual(headers["X-Req-Id"], "request-id")
        self.assertEqual(headers["Referer"], "https://dps.psx.com.pk/")

    def test_psx_fetch_retries_after_expired_token(self):
        url = "https://dps.psx.com.pk/symbols"
        response = mock.MagicMock()
        response.status = 200
        response.read.return_value = b"{}"
        response.headers.get_content_type.return_value = "application/json"
        response.__enter__.return_value = response
        opener = mock.Mock()
        opener.open.side_effect = [
            urllib.error.HTTPError(url, 403, "Forbidden", {}, io.BytesIO(b"denied")),
            response,
        ]
        with mock.patch.object(proxy, "_with_server_key", side_effect=[
                (url, {"X-Req-Id": "expired"}),
                (url, {"X-Req-Id": "fresh"}),
        ]), mock.patch.object(proxy.urllib.request, "build_opener", return_value=opener), \
                mock.patch.object(proxy, "_invalidate_psx_request_id") as invalidate:
            result = proxy.fetch(url)
        self.assertEqual(result, (200, b"{}", "application/json"))
        invalidate.assert_called_once_with("expired")
        self.assertEqual(opener.open.call_count, 2)

    def test_groq_authorization_header(self):
        response = {"choices": [{"message": {"content": "jawab"}}]}
        with mock.patch.object(ai, "_post", return_value=response) as post:
            self.assertEqual(ai._groq("test-key", "sawal", False), "jawab")
        self.assertEqual(post.call_args.args[1]["Authorization"], "Bearer test-key")

    def test_json_response_parsing_and_fallback(self):
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": "g", "GROQ_API_KEY": "q"}), \
                mock.patch.object(ai, "_gemini", return_value="not json"), \
                mock.patch.object(ai, "_groq", return_value='```json\n{"ok": true}\n```'):
            result = ai.generate("hi", True)
        self.assertEqual(json.loads(result["text"]), {"ok": True})
        self.assertEqual(result["provider"], "Groq")

    def test_rate_limiter(self):
        r = ai.RateLimiter(2, 60)
        self.assertEqual([r.allow("a", 0), r.allow("a", 1), r.allow("a", 2), r.allow("b", 2)], [True, True, False, True])
        self.assertTrue(r.allow("a", 100))

    def test_psx_symbols_and_timestamp_normalization(self):
        self.assertTrue(psx.valid_symbol("KSE100"))
        self.assertFalse(psx.valid_symbol("KSE/100"))
        rows = psx.normalize_records({"data": [[1_700_000_001, 12.5], [1_700_000_000_000, 10.0]]})
        self.assertEqual([row["price"] for row in rows], [10.0, 12.5])
        self.assertEqual(rows[0]["time"], 1_700_000_000_000)
        psx_rows = psx.normalize_records({"status": 1, "data": [[1_700_000_001, 12.5, 800]]})
        self.assertEqual((psx_rows[0]["price"], psx_rows[0]["volume"]), (12.5, 800))
        self.assertIsNone(psx_rows[0]["high"])
        eod_rows = psx.normalize_records({"status": 1, "data": [[1_700_000_001, 12.5, 800, 11.0]]})
        self.assertEqual((eod_rows[0]["price"], eod_rows[0]["volume"]), (12.5, 800))
        with mock.patch.object(psx, "_payload", return_value=[
            {"symbol": "OGDC", "name": "Oil & Gas Development Company", "sectorName": "OIL & GAS"}
        ]):
            symbols = psx.get_symbols()
        self.assertIn("KSE100", [item["symbol"] for item in symbols["items"]])
        self.assertEqual(next(item for item in symbols["items"] if item["symbol"] == "OGDC")["sector"], "OIL & GAS")
        with mock.patch.object(psx, "_payload", side_effect=psx.PSXError("unavailable")):
            fallback = psx.symbols_or_fallback()
        self.assertTrue(fallback["fallback"])
        self.assertIn("OGDC", [item["symbol"] for item in fallback["items"]])
        self.assertNotIn("price", fallback["items"][0])

    def test_psx_quote_failure_and_eod_high_low(self):
        rows = [
            {"time": 1000, "price": 14.0, "high": 15.0, "low": 13.0, "volume": 4},
            {"time": 2000, "price": 16.0, "high": 17.0, "low": 15.0, "volume": 5},
        ]
        with mock.patch.object(psx, "get_series", return_value=rows):
            quote = psx.get_quote("OGDC", "eod")
        self.assertEqual((quote["price"], quote["high"], quote["low"]), (16.0, 17.0, 15.0))
        self.assertEqual(quote["pricePeriod"], "eod")
        with mock.patch.object(psx, "_payload", side_effect=psx.PSXError("offline")):
            with self.assertRaises(psx.PSXError):
                psx.get_series("OGDC")

    def test_intraday_quote_uses_session_range_and_previous_eod_close(self):
        int_rows = [
            {"time": int(datetime(2025, 1, 2, 9, tzinfo=timezone.utc).timestamp() * 1000),
             "price": 100.0, "high": None, "low": None, "volume": 500},
            {"time": int(datetime(2025, 1, 2, 9, 1, tzinfo=timezone.utc).timestamp() * 1000),
             "price": 102.0, "high": None, "low": None, "volume": 700},
        ]
        eod_rows = [
            {"time": int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp() * 1000),
             "price": 98.0, "high": None, "low": None, "volume": None},
            {"time": int(datetime(2025, 1, 2, tzinfo=timezone.utc).timestamp() * 1000),
             "price": 99.0, "high": None, "low": None, "volume": None},
        ]

        def series(_symbol, period):
            return int_rows if period == "int" else eod_rows

        with mock.patch.object(psx, "get_series", side_effect=series):
            quote = psx.get_quote("OGDC", "int")
        self.assertEqual((quote["price"], quote["change"]), (102.0, 4.0))
        self.assertEqual(quote["pricePeriod"], "int")
        self.assertEqual((quote["high"], quote["low"], quote["volume"]), (102.0, 100.0, 1200))

        with mock.patch.object(psx, "get_series", side_effect=[psx.PSXError("intraday unavailable"), eod_rows]):
            quote = psx.get_quote("OGDC", "int")
        self.assertEqual((quote["price"], quote["pricePeriod"]), (99.0, "eod"))

        with mock.patch.object(psx, "get_series", side_effect=[int_rows, psx.PSXError("offline")]):
            quote = psx.get_quote("OGDC", "int")
        self.assertIsNone(quote["change"])
        self.assertEqual((quote["high"], quote["low"]), (102.0, 100.0))

        class AfterHours(datetime):
            @classmethod
            def now(cls, tz=None):
                now = datetime(2025, 1, 2, 17, tzinfo=timezone.utc)
                return now.astimezone(tz) if tz else now

        with mock.patch.object(psx, "get_series", side_effect=[int_rows, eod_rows]), \
                mock.patch.object(psx, "datetime", AfterHours):
            quote = psx.get_quote("OGDC", "int")
        self.assertEqual(quote["status"], "delayed")

    def test_news_orders_and_limits_articles(self):
        articles = [
            {"title": f"Pakistan Stock Exchange headline {i}", "url": f"https://news.example/{i}",
             "publishedAt": f"2025-01-{i:02}T00:00:00Z", "source": {"name": "Source"}}
            for i in range(1, 11)
        ]
        articles.append({"title": "Phillips 66 PSX profit", "url": "https://news.example/unrelated",
                         "publishedAt": "2025-01-11T00:00:00Z"})
        with mock.patch.dict(os.environ, {"GNEWS_API_KEY": "test-key"}), \
                mock.patch.object(news.proxy, "fetch", return_value=(200, json.dumps({"articles": articles}).encode(), "application/json")):
            result = news.get_news()
        self.assertEqual(len(result["articles"]), 8)
        self.assertEqual(result["total"], 10)
        self.assertEqual(result["articles"][0]["title"], "Pakistan Stock Exchange headline 10")

    def test_fallback_to_groq_and_disclaimer(self):
        env = {"GEMINI_API_KEY": "g", "GROQ_API_KEY": "q"}
        with mock.patch.dict(os.environ, env), \
                mock.patch.object(ai, "_gemini", side_effect=ai.ProviderError("down")), \
                mock.patch.object(ai, "_groq", return_value="jawab"):
            out = ai.generate("hi", False)
        self.assertEqual(out["provider"], "Groq")
        self.assertTrue(out["text"].startswith("jawab") and "financial mashwara nahi" in out["text"])
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": "g"}), \
                mock.patch.object(ai, "_gemini", return_value="Analysis complete") as gemini:
            out = ai.generate("hi", False, "en")
        self.assertIn("not financial advice", out["text"])
        self.assertEqual(gemini.call_args.args[3], "en")
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": "g"}), \
                mock.patch.object(ai, "_gemini", return_value="تجزیہ"):
            out = ai.generate("hi", False, "ur")
        self.assertIn("مالی مشورہ نہیں", out["text"])
        with self.assertRaises(ValueError):
            ai.generate("hi", False, "fr")


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.srv = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def call(self, method, path, body=None, headers=None):
        c = http.client.HTTPConnection("127.0.0.1", self.srv.server_address[1])
        c.request(method, path, json.dumps(body) if body is not None else None, headers or {})
        r = c.getresponse()
        return r.status, r.read()

    def test_routes(self):
        env = {"GEMINI_API_KEY": "SECRETVALUE", "GROQ_API_KEY": "", "APP_PASSWORD": ""}
        with mock.patch.dict(os.environ, env):
            self.assertEqual(self.call("GET", "/healthz"), (200, b"ok"))
            status, body = self.call("GET", "/")
            self.assertEqual(status, 200)
            self.assertIn(b"PSX Assist Dashboard", body)
            status, body = self.call("GET", "/api/config")
            self.assertEqual(status, 200)
            self.assertNotIn(b"SECRETVALUE", body)
            self.assertTrue(json.loads(body)["keys"]["GEMINI_API_KEY"])
            self.assertEqual(self.call("GET", "/proxy?url=https://evil.com/")[0], 403)
            self.assertEqual(self.call("GET", "/../server/config.py")[0], 404)
            self.assertEqual(self.call("POST", "/api/ai", {"prompt": ""})[0], 400)
            self.assertEqual(self.call("POST", "/api/ai", {"prompt": "hello", "language": "fr"})[0], 400)
            self.assertEqual(self.call("GET", "/api/psx/quote?symbol=KSE%2F100")[0], 400)
            self.assertEqual(self.call("GET", "/api/psx/series?symbol=OGDC&period=other")[0], 400)
            self.assertEqual(self.call("POST", "/api/ai", {"prompt": "x" * (64 * 1024)})[0], 413)

    def test_password_and_no_keys(self):
        with mock.patch.dict(os.environ, {"APP_PASSWORD": "pw", "GEMINI_API_KEY": "", "GROQ_API_KEY": ""}):
            self.assertEqual(self.call("GET", "/api/config")[0], 401)
            self.assertEqual(self.call("GET", "/healthz")[0], 200)
            h = {"Authorization": "Basic " + base64.b64encode(b":pw").decode()}
            self.assertEqual(self.call("POST", "/api/ai", {"prompt": "hi"}, h)[0], 503)


if __name__ == "__main__":
    unittest.main()
