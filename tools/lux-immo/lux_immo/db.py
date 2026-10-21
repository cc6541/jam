from __future__ import annotations

import json
import sqlite3
import time
from pathlib import Path

from .models import Listing

SCHEMA = """
CREATE TABLE IF NOT EXISTS listings(
  uid TEXT PRIMARY KEY, source TEXT, url TEXT, title TEXT, price INTEGER, surface REAL, bedrooms INTEGER,
  location TEXT, property_type TEXT, image TEXT, transaction_type TEXT, first_seen REAL, last_seen REAL,
  active INTEGER DEFAULT 1, prev_price INTEGER, price_history TEXT DEFAULT '[]', hidden INTEGER DEFAULT 0, favorite INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY, started REAL, finished REAL, report TEXT);
"""


class DB:
    def __init__(self, path: str | Path):
        self.c = sqlite3.connect(str(path), check_same_thread=False)
        self.c.row_factory = sqlite3.Row
        self.c.executescript(SCHEMA)

    def upsert(self, l: Listing, now: float | None = None) -> str:
        now = now or time.time()
        row = self.c.execute("SELECT price, price_history FROM listings WHERE uid=?", (l.uid,)).fetchone()
        if row is None:
            hist = json.dumps([[now, l.price]])
            self.c.execute(
                "INSERT INTO listings(uid,source,url,title,price,surface,bedrooms,location,property_type,image,transaction_type,first_seen,last_seen,price_history)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (l.uid, l.source, l.url, l.title, l.price, l.surface, l.bedrooms, l.location, l.property_type, l.image, l.transaction, now, now, hist),
            )
            return "new"
        hist = json.loads(row["price_history"])
        prev = row["price"]
        if l.price != prev:
            hist.append([now, l.price])
        self.c.execute(
            "UPDATE listings SET title=COALESCE(NULLIF(?,''),title), price=?, surface=COALESCE(?,surface), bedrooms=COALESCE(?,bedrooms),"
            " location=COALESCE(NULLIF(?,''),location), property_type=COALESCE(NULLIF(?,''),property_type), image=COALESCE(NULLIF(?,''),image),"
            " last_seen=?, active=1, prev_price=CASE WHEN ?!=price THEN price ELSE prev_price END, price_history=? WHERE uid=?",
            (l.title, l.price, l.surface, l.bedrooms, l.location, l.property_type, l.image, now, l.price, json.dumps(hist), l.uid),
        )
        return "updated" if l.price != prev else "same"

    def deactivate_unseen(self, source: str, run_start: float) -> int:
        cur = self.c.execute("UPDATE listings SET active=0 WHERE source=? AND last_seen<? AND active=1", (source, run_start))
        return cur.rowcount

    def commit(self):
        self.c.commit()

    def list(self) -> list[dict]:
        return [dict(r) for r in self.c.execute("SELECT * FROM listings WHERE hidden=0 ORDER BY first_seen DESC")]

    def set_flag(self, uid: str, field: str, value: int):
        assert field in ("hidden", "favorite")
        self.c.execute(f"UPDATE listings SET {field}=? WHERE uid=?", (value, uid))
        self.c.commit()

    def last_run(self) -> dict | None:
        r = self.c.execute("SELECT * FROM runs ORDER BY id DESC LIMIT 1").fetchone()
        return dict(r) if r else None

    def save_run(self, started: float, report: dict):
        self.c.execute("INSERT INTO runs(started,finished,report) VALUES(?,?,?)", (started, time.time(), json.dumps(report)))
        self.c.commit()
