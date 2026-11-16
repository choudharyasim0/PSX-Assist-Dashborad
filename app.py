# PSX Assist Dashboard: run `python app.py` (opens the browser). On Hugging Face this file is the entry point.
import threading
import webbrowser
from http.server import ThreadingHTTPServer

from server import config, envfile
from server.http import Handler


def main():
    envfile.load()
    host, port = config.host(), config.port()
    url = f"http://localhost:{port}"
    print(f"Chal gaya: {url}")
    if not config.on_hf():
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    ThreadingHTTPServer((host, port), Handler).serve_forever()


if __name__ == "__main__":
    main()
