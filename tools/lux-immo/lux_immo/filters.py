"""Filtre « maisons » + zone Luxembourg-ville et alentours."""
from __future__ import annotations

import re
import unicodedata

from .models import Listing

# Luxembourg-ville (quartiers inclus) et communes/localités limitrophes.
DEFAULT_AREAS = [
    "luxembourg", "luxemburg", "kirchberg", "limpertsberg", "belair", "merl", "hollerich", "gasperich",
    "cessange", "bonnevoie", "gare", "hamm", "cents", "eich", "dommeldange", "weimerskirch", "beggen",
    "rollingergrund", "neudorf", "muhlenbach", "pfaffenthal", "clausen", "grund", "cloche d'or",
    "strassen", "bertrange", "mamer", "hesperange", "howald", "itzig", "alzingen", "fentange",
    "walferdange", "bridel", "kopstal", "steinsel", "heisdorf", "sandweiler", "niederanven",
    "senningerberg", "munsbach", "schuttrange", "contern", "leudelange", "kehlen", "lorentzweiler",
    "bereldange", "findel", "oetrange", "moutfort", "medernach", "roodt-sur-syre", "syren", "weiler-la-tour",
    "frisange", "hobscheid", "garnich", "steinfort", "reckange", "bascharage",
]

HOUSE_WORDS = [
    "maison", "house", "haus", "villa", "pavillon", "einfamilienhaus", "reihenhaus", "doppelhaus",
    "bungalow", "maison de maitre", "maison jumelee", "maison en bande", "townhouse", "chalet",
    "ferme", "fermette", "demeure",
]
NOT_HOUSE_WORDS = [
    "appartement", "apartment", "wohnung", "studio", "duplex", "penthouse", "loft", "terrain",
    "grundstuck", "bureau", "buro", "office", "commerce", "garage", "parking", "emplacement",
    "immeuble", "residence", "programme neuf", "chambre", "colocation", "local commercial",
]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9' -]+", " ", s)


def _has(text: str, words: list[str]) -> bool:
    return any(re.search(rf"(?<![a-z]){re.escape(w)}", text) for w in words)


def is_house(l: Listing) -> bool:
    # Le type explicite prime ; sinon titre + URL.
    t = norm(l.property_type)
    if t:
        if _has(t, NOT_HOUSE_WORDS) and not _has(t, HOUSE_WORDS):
            return False
        if _has(t, HOUSE_WORDS):
            return True
    text = norm(f"{l.title} {l.url}")
    if _has(text, NOT_HOUSE_WORDS) and not _has(text, ["maison", "house", "haus", "villa"]):
        return False
    return _has(text, HOUSE_WORDS)


def in_area(l: Listing, areas: list[str] | None = None) -> bool:
    areas = areas or DEFAULT_AREAS
    loc = norm(l.location)
    if not loc.strip():
        return True  # localisation inconnue : on garde, l'utilisateur tranche
    return any(re.search(rf"(?<![a-z]){re.escape(a)}(?![a-z])", loc) for a in areas)


def keep(l: Listing, areas: list[str] | None = None) -> bool:
    return is_house(l) and in_area(l, areas)
