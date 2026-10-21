from __future__ import annotations

import json
import time
from pathlib import Path
from urllib.parse import urlparse

from .db import DB
from .extract import extract
from .fetch import Fetcher
from .filters import keep

DEFAULT_CONFIG = Path(__file__).resolve().parent.parent / "sources.json"


def load_config(path: str | Path | None = None) -> dict:
    return json.loads(Path(path or DEFAULT_CONFIG).read_text(encoding="utf-8"))


def scrape_source(src: dict, fetcher: Fetcher, areas: list[str] | None, log=print) -> tuple[list, dict]:
    name = src["name"]
    rep = {"pages": 0, "raw": 0, "kept": 0, "errors": []}
    kept: dict[str, object] = {}
    for entry in src["urls"]:
        e = {"url": entry} if isinstance(entry, str) else entry
        url_t, tx = e["url"], e.get("transaction", src.get("transaction", "sale"))
        base = "{0.scheme}://{0.netloc}".format(urlparse(url_t))
        seen_here: set[str] = set()
        for page in range(1, src.get("max_pages", 5) + 1):
            url = url_t.replace("{page}", str(page)) if "{page}" in url_t else url_t
            try:
                html = fetcher.get(url)
            except Exception as ex:  # noqa: BLE001 - on continue avec les autres sources
                rep["errors"].append(str(ex))
                break
            rep["pages"] += 1
            items = extract(html, name, base, tx)
            rep["raw"] += len(items)
            fresh = [l for l in items if l.uid not in seen_here]
            seen_here.update(l.uid for l in items)
            for l in fresh:
                if src.get("trust_filters") or keep(l, areas):
                    kept[l.uid] = l
            if not fresh or "{page}" not in url_t:
                break
        log(f"  {name}: {len(kept)} retenues, {rep['errors'] and len(rep['errors'])} erreurs")
    rep["kept"] = len(kept)
    return list(kept.values()), rep


def refresh(db: DB, config: dict | None = None, only: list[str] | None = None, log=print) -> dict:
    cfg = config or load_config()
    fetcher = Fetcher(delay=cfg.get("delay", 1.5), respect_robots=cfg.get("respect_robots", True))
    areas = cfg.get("areas")
    started = time.time()
    report: dict = {}
    for src in cfg["sources"]:
        if src.get("disabled") or (only and src["name"] not in only):
            continue
        log(f"Source {src['name']}…")
        listings, rep = scrape_source(src, fetcher, areas, log)
        new = 0
        for l in listings:
            new += db.upsert(l, started) == "new"
        # On ne désactive que si la source a bien répondu (évite de tout « fermer » sur une panne).
        rep["new"] = new
        rep["closed"] = db.deactivate_unseen(src["name"], started) if listings and not rep["errors"] else 0
        db.commit()
        report[src["name"]] = rep
    db.save_run(started, report)
    return report
