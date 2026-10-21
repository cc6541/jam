from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

from .db import DB
from .scraper import load_config, refresh
from .server import serve

DB_DEFAULT = str(Path(__file__).resolve().parent.parent / "data" / "listings.db")


def main(argv=None):
    p = argparse.ArgumentParser(prog="lux_immo", description="Hub d'annonces de maisons - Luxembourg")
    p.add_argument("--db", default=DB_DEFAULT)
    p.add_argument("--config", default=None, help="chemin vers un sources.json alternatif")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("serve", help="lance le hub web (bouton « Actualiser »)").add_argument("--port", type=int, default=8765)
    r = sub.add_parser("refresh", help="scrape toutes les sources maintenant")
    r.add_argument("--only", nargs="*", help="noms de sources")
    sub.add_parser("check", help="diagnostic : annonces trouvées par source")
    sub.add_parser("export", help="exporte les annonces actives en CSV (stdout)")
    a = p.parse_args(argv)
    Path(a.db).parent.mkdir(parents=True, exist_ok=True)

    if a.cmd == "serve":
        serve(a.db, a.config, port=a.port)
        return 0
    db = DB(a.db)
    if a.cmd in ("refresh", "check"):
        rep = refresh(db, load_config(a.config), only=getattr(a, "only", None))
        for name, r_ in rep.items():
            flag = "OK " if r_["kept"] and not r_["errors"] else "?? "
            print(f"{flag}{name}: pages={r_['pages']} brutes={r_['raw']} retenues={r_['kept']} nouvelles={r_['new']} fermées={r_['closed']}")
            for e in r_["errors"][:3]:
                print(f"     ! {e}")
    elif a.cmd == "export":
        w = csv.writer(sys.stdout)
        w.writerow(["source", "titre", "prix", "surface", "chambres", "lieu", "url", "vu_le"])
        for l in db.list():
            if l["active"]:
                w.writerow([l["source"], l["title"], l["price"], l["surface"], l["bedrooms"], l["location"], l["url"], l["first_seen"]])
    return 0


if __name__ == "__main__":
    sys.exit(main())
