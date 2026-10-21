from lux_immo.db import DB
from lux_immo.extract import extract, parse_num
from lux_immo.filters import is_house, in_area
from lux_immo.models import Listing

NEXT = """<script id="__NEXT_DATA__" type="application/json">{"props":{"results":[
 {"url":"/vente/maison-strassen-1","title":"Belle maison","price":{"value":1250000},"surface":210,"bedrooms":4,"city":"Strassen","propertyType":"Maison"},
 {"url":"/vente/appart-1","title":"Appartement","price":650000,"city":"Luxembourg","propertyType":"Appartement"}]}}</script>"""
HTML = """<div class="card"><a href="/annonce/12">Maison 4 chambres Bertrange</a><span>1.450.000 €</span><span>180 m²</span><span>4 chambres</span></div>"""


def test_parse_num():
    assert parse_num("1 250 000 €") == 1250000 and parse_num("1.450.000 €") == 1450000 and parse_num({"value": "980000"}) == 980000


def test_next_data_and_filters():
    ls = extract(NEXT, "t", "https://x.lu")
    assert len(ls) == 2 and ls[0].url == "https://x.lu/vente/maison-strassen-1" and ls[0].surface == 210
    assert [is_house(l) for l in ls] == [True, False]


def test_html_fallback():
    (l,) = extract(HTML, "t", "https://x.lu")
    assert l.price == 1450000 and l.surface == 180 and l.bedrooms == 4 and is_house(l)


def test_area():
    assert in_area(Listing("s", "u", location="L-8010 Strassen"))
    assert not in_area(Listing("s", "u", location="Esch-sur-Alzette"))
    assert in_area(Listing("s", "u", location=""))


def test_db_lifecycle():
    db = DB(":memory:")
    l = Listing("s", "https://x/1", "M", 1000000)
    assert db.upsert(l, 100) == "new" and db.upsert(l, 200) == "same"
    l.price = 900000
    assert db.upsert(l, 300) == "updated"
    row = db.list()[0]
    assert row["prev_price"] == 1000000 and row["price"] == 900000
    assert db.deactivate_unseen("s", 400) == 1
