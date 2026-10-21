"""Extraction générique d'annonces : JSON-LD, __NEXT_DATA__/JSON embarqué, puis heuristique HTML."""
from __future__ import annotations

import json
import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .models import Listing

URL_KEYS = ("url", "link", "permalink", "href", "detailUrl", "canonicalUrl", "absoluteUrl", "@id")
PRICE_KEYS = ("price", "prix", "priceValue", "amount", "salePrice", "formattedPrice", "priceFormatted")
TITLE_KEYS = ("title", "name", "headline", "label", "titre")
SURFACE_KEYS = ("surface", "area", "livingArea", "livingSpace", "surfaceArea", "size", "floorSize", "m2", "squareMeters")
BED_KEYS = ("bedrooms", "numberOfBedrooms", "nbBedrooms", "chambres", "bedroomCount", "rooms", "numberOfRooms")
TYPE_KEYS = ("propertyType", "typology", "category", "type", "propertyCategory", "subType")
IMG_KEYS = ("image", "photo", "thumbnail", "picture", "cover", "mainPhoto", "images", "photos")
LOC_KEYS = ("city", "locality", "addressLocality", "location", "address", "town", "commune", "place", "neighbourhood")


def parse_num(v) -> float | None:
    if isinstance(v, bool) or v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, dict):
        for k in ("value", "amount", "raw", "price", "min"):
            if k in v and (n := parse_num(v[k])) is not None:
                return n
        return None
    if isinstance(v, str):
        m = re.search(r"\d[\d\s.,  ']*", v)
        if not m:
            return None
        s = re.sub(r"[\s  ']", "", m.group())
        if re.fullmatch(r"\d{1,3}([.,]\d{3})+", s):  # séparateur de milliers
            s = re.sub(r"[.,]", "", s)
        else:
            s = s.replace(",", ".")
        try:
            return float(s)
        except ValueError:
            return None
    return None


def _first(d: dict, keys):
    for k in keys:
        if k in d and d[k] not in (None, "", [], {}):
            return d[k]
    return None


def _text(v) -> str:
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, dict):
        parts = [_text(v.get(k)) for k in ("addressLocality", "city", "name", "label", "district", "neighbourhood", "postalCode") if v.get(k)]
        return ", ".join(p for p in parts if p)
    if isinstance(v, list) and v:
        return _text(v[0])
    return ""


def _img(v) -> str:
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        return _img(_first(v, ("url", "src", "contentUrl", "large", "medium")))
    if isinstance(v, list) and v:
        return _img(v[0])
    return ""


def item_to_listing(d: dict, source: str, base: str, transaction: str = "sale") -> Listing | None:
    url = _first(d, URL_KEYS)
    price = parse_num(_first(d, PRICE_KEYS))
    if "offers" in d and price is None:
        o = d["offers"]
        price = parse_num(_first(o[0] if isinstance(o, list) and o else o, PRICE_KEYS) if isinstance(o, (dict, list)) and o else None)
        url = url or (o[0] if isinstance(o, list) and o else o).get("url") if isinstance(o, (dict, list)) and o else url
    if not isinstance(url, str) or price is None:
        return None
    url = urljoin(base, url)
    surface = parse_num(_first(d, SURFACE_KEYS))
    beds = parse_num(_first(d, BED_KEYS))
    return Listing(
        source=source, url=url, title=_text(_first(d, TITLE_KEYS)), price=int(price) if price else None,
        surface=surface if surface and 10 <= surface <= 3000 else None,
        bedrooms=int(beds) if beds is not None and 0 <= beds < 30 else None,
        location=_text(_first(d, LOC_KEYS)), property_type=_text(_first(d, TYPE_KEYS)),
        image=urljoin(base, _img(_first(d, IMG_KEYS))) if _first(d, IMG_KEYS) else "", transaction=transaction,
    )


def _walk(o, out: list[dict]):
    if isinstance(o, dict):
        if _first(o, URL_KEYS) and (_first(o, PRICE_KEYS) is not None or "offers" in o):
            out.append(o)
        for v in o.values():
            _walk(v, out)
    elif isinstance(o, list):
        for v in o:
            _walk(v, out)


def from_json_blobs(soup: BeautifulSoup, source: str, base: str, transaction: str) -> list[Listing]:
    blobs = []
    for s in soup.find_all("script"):
        t = s.get("type", "")
        if t == "application/ld+json" or s.get("id") == "__NEXT_DATA__" or t == "application/json":
            try:
                blobs.append(json.loads(s.string or ""))
            except (ValueError, TypeError):
                pass
    items: list[dict] = []
    for b in blobs:
        _walk(b, items)
    res = [l for d in items if (l := item_to_listing(d, source, base, transaction))]
    return [l for l in res if l.price and l.price > 1000]


def from_html(soup: BeautifulSoup, source: str, base: str, transaction: str) -> list[Listing]:
    """Dernier recours : cartes contenant un lien + un prix en €."""
    seen: dict[str, Listing] = {}
    for a in soup.find_all("a", href=True):
        href = urljoin(base, a["href"])
        if href in seen or href.rstrip("/") == base.rstrip("/"):
            continue
        card = a
        for _ in range(4):
            if card.parent is None:
                break
            card = card.parent
            txt = card.get_text(" ", strip=True)
            if "€" in txt or "EUR" in txt:
                break
        else:
            continue
        txt = card.get_text(" ", strip=True)
        pm = re.search(r"(\d[\d\s.,  ]*)\s*(?:€|EUR)", txt) or re.search(r"(?:€|EUR)\s*(\d[\d\s.,  ]*)", txt)
        if not pm or len(txt) > 700:
            continue
        price = parse_num(pm.group(1))
        if not price or price < 1000:
            continue
        sm = re.search(r"(\d[\d.,]*)\s*m\s?[²2]", txt)
        bm = re.search(r"(\d+)\s*(?:chambres?|ch\.|bedrooms?|schlafzimmer|bed)", txt, re.I)
        img = card.find("img")
        title = (a.get("title") or a.get_text(" ", strip=True) or (img.get("alt") if img else "") or "")[:200]
        seen[href] = Listing(
            source=source, url=href, title=title, price=int(price),
            surface=parse_num(sm.group(1)) if sm else None, bedrooms=int(bm.group(1)) if bm else None,
            location="", image=urljoin(base, (img.get("src") or img.get("data-src") or "")) if img else "",
            transaction=transaction, extra={"text": txt[:300]},
        )
    return list(seen.values())


def extract(html: str, source: str, base: str, transaction: str = "sale") -> list[Listing]:
    soup = BeautifulSoup(html, "lxml")
    found = from_json_blobs(soup, source, base, transaction)
    if not found:
        found = from_html(soup, source, base, transaction)
    uniq: dict[str, Listing] = {}
    for l in found:
        uniq.setdefault(l.uid, l)
    return list(uniq.values())
