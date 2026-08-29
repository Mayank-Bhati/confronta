# -*- coding: utf-8 -*-
"""Put every catalogue city in the database with a sourced rent RANGE.

Why this exists
---------------
The cards used to show one number: "~€979/month". That reads as a measurement
and it is not one. Rent is the largest and most variable part of a student's
budget, and the single largest lever a student actually controls is whether
they share a room. Showing the midpoint hides exactly the choice that matters.

So each city now carries two sourced figures instead of one, and the card shows
the span between them.

Where the numbers come from
---------------------------
Immobiliare.it Insights, the largest listings dataset in Italy, publishes a
per-city survey of student room prices.

  HIGH end -- average private single room ("stanza singola"), 2025 edition:
  https://www.immobiliare.it/info/ufficio-stampa/2025/stanze-prezzi-in-crescita
  -domanda-stabile-milano-supera-i-730-euro-mese-per-una-singola-2718/

  LOW end -- shared room ("posto letto in doppia"). The 2025 edition reports
  singles only, so the shared figure comes from the most recent edition that
  published both, and is applied as that city's OWN shared/single ratio against
  its 2025 single price:
  https://www.immobiliare.it/news/osservatorio-immobiliare/borsino-immobiliare/
  non-si-ferma-la-corsa-dei-prezzi-delle-stanze-singole-e-doppie-sono-sempre-
  piu-care-7-e-sempre-piu-richieste-27-225497/

Using the ratio rather than the older absolute figure is deliberate. Price
levels moved between the two editions (Milano single went 637 -> 732); the
relationship between a shared and a single room did not -- it sits in a narrow
0.50-0.70 band in every city surveyed, because it reflects what a second bed in
a room is worth, not what the market did that year. Mixing the two editions'
absolute numbers would understate the low end by roughly a year of inflation.

Seven cities appear in neither table. They keep the estimate already in the
catalogue and are marked `estimate` in `source`, so the card can say so rather
than implying the same standing as a surveyed figure. Guessing a number and
presenting it identically to a measured one is the failure mode this whole
change exists to remove.

    python3 main.py seed-rents [--dry-run]
"""
from sqlalchemy import text

from .db import Session

SINGLE_2025 = "immobiliare.it Insights 2025 — stanza singola"
SHARED_RATIO = "shared = city's own doppia/singola ratio (Immobiliare.it Insights)"

# city: (lat, lon, size, single_2025, shared_ratio, utilities, food, transport, vibe)
# shared_ratio None => no survey covers this city; see ESTIMATED below.
CITIES = {
    "Milano":    (45.4642,  9.1900, "large",  732, 353 / 637, 100, 200, 22, "Big, fast, most opportunities, most expensive"),
    "Bologna":   (44.4949, 11.3426, "medium", 632, 264 / 506, 100, 190, 27, "Italy's classic student city"),
    "Firenze":   (43.7696, 11.2558, "medium", 606, 245 / 493, 100, 190, 25, "Art everywhere, tourist prices"),
    "Roma":      (41.9028, 12.4964, "large",  575, 283 / 503, 100, 190, 35, "Huge, historic, chaotic, endless options"),
    "Trento":    (46.0748, 11.1217, "small",  544, 194 / 381,  95, 180, 25, "Mountains, high quality of life, strong services"),
    "Brescia":   (45.5416, 10.2118, "medium", 519, 252 / 399,  95, 180, 22, "Industrial Lombardy, cheaper than Milan and an hour away"),
    "Padova":    (45.4064, 11.8768, "medium", 502, 237 / 442,  95, 180, 25, "Classic student city, everything walkable"),
    "Torino":    (45.0703,  7.6869, "large",  476, 228 / 409, 100, 180, 25, "Elegant, livable, strong student scene"),
    "Verona":    (45.4384, 10.9916, "medium", 473, 221 / 407,  95, 180, 25, "Elegant, well connected, quietly wealthy"),
    "Bergamo":   (45.6983,  9.6773, "small",  466, 244 / 448,  90, 170, 22, "Quiet, industrial heartland, close-knit"),
    "Venezia":   (45.4408, 12.3155, "medium", 453, 227 / 417,  95, 190, 30, "Unique, compact, tourist-heavy — student life on the mainland too"),
    "Napoli":    (40.8518, 14.2681, "large",  445, 271 / 405,  90, 170, 25, "Intense, warm, cheapest big city"),
    "Parma":     (44.8015, 10.3279, "small",  415, 190 / 365,  90, 175, 22, "Food capital, compact and liveable"),
    "Bari":      (41.1171, 16.8719, "medium", 380, 210 / 357,  90, 165, 22, "Seaside, growing, affordable"),
    "Genova":    (44.4056,  8.9463, "large",  364, 189 / 344,  95, 175, 25, "Sea and hills, affordable for a big city"),
    "Pavia":     (45.1847,  9.1582, "small",  363, 221 / 330,  90, 175, 20, "College-town feel, 30 minutes from Milan"),
    "Pisa":      (43.7228, 10.4017, "small",  328, 203 / 324,  90, 175, 20, "Small, academic, cheap by Tuscan standards"),
    "Palermo":   (38.1157, 13.3615, "large",  278, 170 / 282,  85, 160, 22, "Beautiful, affordable, far from the north"),
    "Catania":   (37.5079, 15.0830, "large",  263, 174 / 248,  85, 160, 22, "Volcano and sea, lively and inexpensive"),
}

# No survey covers these. The single-room figure is the estimate already in the
# catalogue; the shared figure uses the national ratio (266/461) because no
# city-specific one exists. Marked `estimate` so the card can label it.
NATIONAL_RATIO = 266 / 461
ESTIMATED = {
    "Cremona":            (45.1332, 10.0227, "small",  380,  85, 165, 20, "Small, calm, low cost of living"),
    "Piacenza":           (45.0526,  9.6930, "small",  400,  90, 170, 20, "Compact student city between Milano and Bologna"),
    "Mantova":            (45.1564, 10.7914, "small",  380,  85, 165, 20, "Renaissance town, small campus community"),
    "Lecco":              (45.8566,  9.3977, "small",  430,  90, 175, 22, "Lakeside campus town, quiet and outdoorsy"),
    "Monza":              (45.5845,  9.2744, "medium", 500,  95, 185, 25, "Green, orderly, a train away from Milan"),
    "Sesto San Giovanni": (45.5347,  9.2405, "large",  550, 100, 195, 22, "Milan's industrial north — metro to the centre"),
    "Cagliari":           (39.2238,  9.1217, "medium", 330,  85, 165, 22, "Island capital, beaches on the doorstep"),
    "Salerno":            (40.6824, 14.7681, "medium", 300,  85, 160, 22, "Seafront, affordable, near the Amalfi coast"),
}


def slugify(name):
    return name.lower().replace(" ", "-").replace("'", "")


def rows():
    """Every catalogue city as a dict ready to upsert."""
    out = []
    for name, (lat, lon, size, single, ratio, util, food, tr, vibe) in CITIES.items():
        out.append(dict(
            slug=slugify(name), name=name, lat=lat, lon=lon, size=size,
            rent_single_room=single, rent_shared_room=int(round(single * ratio)),
            utilities=util, food=food, transport=tr, vibe=vibe,
            source=f"{SINGLE_2025}; {SHARED_RATIO}",
        ))
    for name, (lat, lon, size, single, util, food, tr, vibe) in ESTIMATED.items():
        out.append(dict(
            slug=slugify(name), name=name, lat=lat, lon=lon, size=size,
            rent_single_room=single, rent_shared_room=int(round(single * NATIONAL_RATIO)),
            utilities=util, food=food, transport=tr, vibe=vibe,
            source="estimate — no city-level student rent survey published",
        ))
    return out


DDL = """
alter table cities add column if not exists rent_shared_room integer;
"""

UPSERT = """
insert into cities (slug, name, lat, lon, size, rent_single_room, rent_shared_room,
                    utilities, food, transport, vibe, source)
values (:slug, :name, :lat, :lon, :size, :rent_single_room, :rent_shared_room,
        :utilities, :food, :transport, :vibe, :source)
on conflict (slug) do update set
  name = excluded.name, lat = excluded.lat, lon = excluded.lon, size = excluded.size,
  rent_single_room = excluded.rent_single_room, rent_shared_room = excluded.rent_shared_room,
  utilities = excluded.utilities, food = excluded.food, transport = excluded.transport,
  vibe = excluded.vibe, source = excluded.source
"""


def run(dry_run=False):
    data = rows()
    surveyed = sum(1 for r in data if not r["source"].startswith("estimate"))
    print(f"{len(data)} cities — {surveyed} surveyed, {len(data) - surveyed} estimated")
    for r in sorted(data, key=lambda r: -r["rent_single_room"]):
        mark = "" if not r["source"].startswith("estimate") else "   (estimate)"
        print(f"  {r['name']:20} shared €{r['rent_shared_room']:>3}  single €{r['rent_single_room']:>3}{mark}")
    if dry_run:
        print("\ndry run — nothing written")
        return
    with Session() as s:
        s.execute(text(DDL))
        for r in data:
            s.execute(text(UPSERT), r)
        s.commit()
    print(f"\nwrote {len(data)} cities")


if __name__ == "__main__":
    import sys
    run(dry_run="--dry-run" in sys.argv)
