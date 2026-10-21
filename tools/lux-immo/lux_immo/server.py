from __future__ import annotations

import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from .db import DB
from .scraper import load_config, refresh

STATIC = Path(__file__).parent / "static" / "index.html"


class State:
    def __init__(self, db_path: str, config: str | None):
        self.db_path, self.config = db_path, config
        self.running, self.log, self.lock = False, [], threading.Lock()

    def start_refresh(self) -> bool:
        with self.lock:
            if self.running:
                return False
            self.running, self.log = True, []
        threading.Thread(target=self._run, daemon=True).start()
        return True

    def _run(self):
        try:
            db = DB(self.db_path)  # connexion propre au thread
            refresh(db, load_config(self.config), log=lambda m: self.log.append(m))
        except Exception as e:  # noqa: BLE001
            self.log.append(f"ERREUR: {e}")
        finally:
            self.running = False


def make_handler(state: State):
    class H(BaseHTTPRequestHandler):
        def _send(self, code: int, body: bytes, ctype="application/json"):
            self.send_response(code)
            self.send_header("Content-Type", ctype + "; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _json(self, obj, code=200):
            self._send(code, json.dumps(obj).encode())

        def do_GET(self):
            db = DB(state.db_path)
            if self.path in ("/", "/index.html"):
                self._send(200, STATIC.read_bytes(), "text/html")
            elif self.path == "/api/listings":
                self._json(db.list())
            elif self.path == "/api/status":
                lr = db.last_run()
                self._json({"running": state.running, "log": state.log[-15:], "last_run": lr, "now": time.time()})
            else:
                self._send(404, b"{}")

        def do_POST(self):
            if self.path == "/api/refresh":
                self._json({"started": state.start_refresh()})
            elif self.path == "/api/flag":
                n = int(self.headers.get("Content-Length", 0))
                d = json.loads(self.rfile.read(n) or b"{}")
                DB(state.db_path).set_flag(d["uid"], d["field"], int(d["value"]))
                self._json({"ok": True})
            else:
                self._send(404, b"{}")

        def log_message(self, *a):
            pass

    return H


def serve(db_path: str, config: str | None, host="127.0.0.1", port=8765):
    DB(db_path)  # crée le schéma
    srv = ThreadingHTTPServer((host, port), make_handler(State(db_path, config)))
    print(f"Hub : http://{host}:{port}  (Ctrl+C pour arrêter)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
