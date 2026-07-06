"""Seed the DB with the verified research-workbook data (6 Jul 2026).

Everything here traces to the sources compiled in
~/Downloads/CareerCompass-real-data-research.xlsx — institutions and fees,
ITS Academy courses, Bocconi/Bicocca/UniTo bachelor programmes, city living
costs, ISEE bands and outcome benchmarks. Idempotent: matched by slug/name.
"""
import re
from datetime import datetime

from .db import Benchmark, City, IseeBand, Institution, Program, Session

SRC = {
    "isee": "https://www.studenti.it/fasce-isee-universita-2026-guida-al-calcolo-delle-tasse-universitarie-e-alla-no-tax-area.html",
    "dsu": "https://www.universita.it/borse-di-studio-2025-2026-ecco-i-nuovi-limiti-per-isee-e-ispe/",
    "rents": "https://www.idealista.it/news/immobiliare/residenziale/2024/09/23/183276-quanto-costa-affittare-una-stanza-in-italia-se-sei-uno-studente-fuorisede",
    "alma": "https://www.almalaurea.it/news/rapporto-almalaurea-2025",
    "indire": "https://www.indire.it/2025/04/17/its-academy-ad-un-anno-dal-diploma-l84-dei-diplomati-trova-lavoro/",
    "bicocca": "https://www.unimib.it/sites/default/files/2025-07/Guida%20CONTRIBUZIONE%2025_26_0.pdf",
    "bocconi": "https://www.unibocconi.it/en/applying-bocconi/bachelor-and-law-programs/fees",
    "bocconi_ug": "https://www.unibocconi.it/en/about-us/organization/schools/undergraduate-school",
    "mecc": "https://www.itslombardiameccatronica.it/corsi/",
    "rizzoli": "https://www.itsrizzoli.it/corsi/",
    "energia": "https://its-energiapiemonte.it/",
}

INSTITUTIONS = [
    # slug, name, kind, city, region, website, no_tax_isee, fee_min, fee_max
    ("unimib", "Università Milano-Bicocca", "university", "Milano", "Lombardia", "https://www.unimib.it", 27000, 156, 4100),
    ("bocconi", "Università Bocconi", "university", "Milano", "Lombardia", "https://www.unibocconi.it", None, 3000, 17000),
    ("unito", "Università di Torino", "university", "Torino", "Piemonte", "https://www.unito.it", 22000, 156, 2800),
    ("its-lomb-mecc", "ITS Lombardia Meccatronica", "its", "Sesto San Giovanni", "Lombardia", "https://www.itslombardiameccatronica.it", None, 0, 0),
    ("its-rizzoli", "ITS Angelo Rizzoli", "its", "Milano", "Lombardia", "https://www.itsrizzoli.it", None, 0, 0),
    ("its-energia-pi", "ITS Energia Piemonte", "its", "Torino", "Piemonte", "https://its-energiapiemonte.it", None, 0, 0),
]

# slug → [(programme name, level, campus, language, years, url, source)]
PROGRAMS = {
    "unimib": [
        ("Informatica", "bachelor", "Milano", "ITA", 3, "https://www.unimib.it", SRC["bicocca"]),
        ("Fisica", "bachelor", "Milano", "ITA", 3, "https://www.unimib.it", SRC["bicocca"]),
        ("Scienze Statistiche ed Economiche", "bachelor", "Milano", "ITA", 3, "https://www.unimib.it", SRC["bicocca"]),
        ("Economia e Commercio", "bachelor", "Milano", "ITA", 3, "https://www.unimib.it", SRC["bicocca"]),
        ("Marketing, Comunicazione Aziendale e Mercati Globali", "bachelor", "Milano", "ITA", 3, "https://www.unimib.it", SRC["bicocca"]),
        ("Scienze dell'Organizzazione", "bachelor", "Milano", "ITA", 3, "https://www.unimib.it", SRC["bicocca"]),
    ],
    "bocconi": [
        ("International Economics and Management (BIEM)", "bachelor", "Milano", "ENG", 3, SRC["bocconi_ug"], SRC["bocconi_ug"]),
        ("International Economics and Finance (BIEF)", "bachelor", "Milano", "ENG", 3, SRC["bocconi_ug"], SRC["bocconi_ug"]),
        ("Economic and Social Sciences (BESS)", "bachelor", "Milano", "ENG", 3, SRC["bocconi_ug"], SRC["bocconi_ug"]),
        ("International Politics and Government (BIG)", "bachelor", "Milano", "ENG", 3, SRC["bocconi_ug"], SRC["bocconi_ug"]),
        ("Economics, Management and Computer Science (BEMACS)", "bachelor", "Milano", "ENG", 3, SRC["bocconi_ug"], SRC["bocconi_ug"]),
        ("Mathematical and Computing Sciences for AI (BAI)", "bachelor", "Milano", "ENG", 3, SRC["bocconi_ug"], SRC["bocconi_ug"]),
        ("World Bachelor in Business (WBB)", "bachelor", "Milano", "ENG", 4, SRC["bocconi_ug"], SRC["bocconi_ug"]),
    ],
    "unito": [
        ("Infermieristica", "bachelor", "Torino", "ITA", 3, "https://www.unito.it", "https://www.unito.it"),
    ],
    "its-lomb-mecc": [
        ("Factory Automation", "its", "Sesto San Giovanni", "ITA", 2, SRC["mecc"], SRC["mecc"]),
        ("Process Automation", "its", "Sesto San Giovanni", "ITA", 2, SRC["mecc"], SRC["mecc"]),
        ("Tech Commercial & Solution Service", "its", "Sesto San Giovanni", "ITA", 2, SRC["mecc"], SRC["mecc"]),
        ("CircuIT Specialist", "its", "Sesto San Giovanni", "ITA", 2, SRC["mecc"], SRC["mecc"]),
        ("Smart Diagnostics", "its", "Sesto San Giovanni", "ITA", 2, SRC["mecc"], SRC["mecc"]),
        ("Meccatronica Biomedicale", "its", "Milano", "ITA", 2, SRC["mecc"], SRC["mecc"]),
        ("Autoferrotranviaria", "its", "Milano", "ITA", 2, SRC["mecc"], SRC["mecc"]),
        ("Automotive Tech Service Engineering", "its", "Milano", "ITA", 2, SRC["mecc"], SRC["mecc"]),
    ],
    "its-rizzoli": [
        ("Software Architect Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("AI & Full Stack Developer Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("Coding & AI Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("Cloud Development Operations (DevOps) Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("3D Simulation & Metaverse Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("Network and Cloud Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("Cyber Defence Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("Big Data Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("AI and Machine Learning Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("AI & Robotics for Automation Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("Energy & Digital Process Specialist", "its", "Bergamo", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("Digital Marketing Data Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("Omnichannel Communication Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
        ("Packaging Specialist", "its", "Milano", "ITA", 2, SRC["rizzoli"], SRC["rizzoli"]),
    ],
    "its-energia-pi": [
        ("Energy Manager", "its", "Torino", "ITA", 2, SRC["energia"], SRC["energia"]),
        ("Energy & Circular Economy Specialist", "its", "Torino", "ITA", 2, SRC["energia"], SRC["energia"]),
        ("Building Manager", "its", "Torino", "ITA", 2, SRC["energia"], SRC["energia"]),
        ("Home Manager", "its", "Torino", "ITA", 2, SRC["energia"], SRC["energia"]),
    ],
}

CITIES = [
    # slug, name, lat, lon, size, rent, utilities, food, transport, vibe
    ("milano", "Milano", 45.4642, 9.19, "large", 664, 100, 200, 22, "Big, fast, most opportunities, most expensive"),
    ("torino", "Torino", 45.0703, 7.6869, "large", 525, 100, 180, 25, "Elegant, livable, strong student scene"),
    ("bologna", "Bologna", 44.4949, 11.3426, "medium", 655, 100, 190, 27, "Italy's classic student city"),
    ("roma", "Roma", 41.9028, 12.4964, "large", 600, 100, 190, 35, "Huge, historic, chaotic, endless options"),
    ("bergamo", "Bergamo", 45.6983, 9.6773, "small", 450, 90, 170, 22, "Quiet, industrial heartland, close-knit"),
]

ISEE_BANDS = [
    ("low", 0, 22000, "Full exemption (no-tax area, L.232/2016): €0 tuition, only regional tax + stamp (~€156-176)", SRC["isee"]),
    ("mid", 22001, 30000, "Graduated reduction: 80% (22-24k), 50% (24-26k), 25% (26-28k), 10% (28-30k)", SRC["isee"]),
    ("high", 30001, None, "Full contribution — university-specific curve up to a cap", SRC["isee"]),
    ("dsu", 0, 27948, "DSU scholarship eligibility (also ISPE ≤ €54,700), a.y. 2025/26", SRC["dsu"]),
]

BENCHMARKS = [
    ("Employment 1y after bachelor", "78.6%", "AlmaLaurea 2025, 690k graduates, 81 universities", SRC["alma"]),
    ("Unemployment 1y after bachelor", "9.7%", "AlmaLaurea 2025", SRC["alma"]),
    ("Net monthly salary 1y after bachelor", "€1,492", "AlmaLaurea 2025 (2024 graduates)", SRC["alma"]),
    ("Net monthly salary 5y after bachelor", "€1,770", "AlmaLaurea (first-level graduates)", SRC["alma"]),
    ("Study abroad employment boost", "+7.9%", "AlmaLaurea 2025", SRC["alma"]),
    ("ITS employment 1y after diploma", "84%", "INDIRE 2025, 8,588 graduates, 109 ITS", SRC["indire"]),
    ("ITS job coherence with course", "93%", "INDIRE 2025", SRC["indire"]),
    ("ITS completion rate", "72.6%", "INDIRE 2025", SRC["indire"]),
]


def seed():
    stats = {"institutions": 0, "programs": 0, "cities": 0, "isee_bands": 0, "benchmarks": 0}
    with Session() as s:
        for slug, name, kind, city, region, website, no_tax, fmin, fmax in INSTITUTIONS:
            inst = s.query(Institution).filter_by(slug=slug).one_or_none()
            if not inst:
                inst = Institution(slug=slug)
                s.add(inst)
                stats["institutions"] += 1
            inst.name, inst.kind, inst.city, inst.region = name, kind, city, region
            inst.website, inst.no_tax_isee, inst.fee_min, inst.fee_max = website, no_tax, fmin, fmax
        s.commit()

        for slug, progs in PROGRAMS.items():
            inst = s.query(Institution).filter_by(slug=slug).one()
            for name, level, campus, lang, years, url, source in progs:
                # catalog-level URLs get a name anchor so the per-programme
                # unique constraint holds until exact-URL adapters land
                anchor = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
                unique_url = url if "#" in url else f"{url}#{anchor}"
                prog = s.query(Program).filter_by(institution_id=inst.id, name=name).one_or_none()
                if not prog:
                    prog = Program(institution_id=inst.id, name=name, url=unique_url)
                    s.add(prog)
                    stats["programs"] += 1
                prog.level, prog.campus, prog.language, prog.years = level, campus, lang, years
                prog.url, prog.source, prog.fetched_at = unique_url, source, datetime.utcnow()
        s.commit()

        for slug, name, lat, lon, size, rent, util, food, transport, vibe in CITIES:
            c = s.query(City).filter_by(slug=slug).one_or_none()
            if not c:
                c = City(slug=slug)
                s.add(c)
                stats["cities"] += 1
            c.name, c.lat, c.lon, c.size = name, lat, lon, size
            c.rent_single_room, c.utilities, c.food, c.transport = rent, util, food, transport
            c.vibe, c.source = vibe, SRC["rents"]
        s.commit()

        s.query(IseeBand).delete()
        for band, lo, hi, desc, src in ISEE_BANDS:
            s.add(IseeBand(band=band, isee_min=lo, isee_max=hi, description=desc, source=src))
            stats["isee_bands"] += 1
        s.commit()

        for metric, value, pop, src in BENCHMARKS:
            b = s.query(Benchmark).filter_by(metric=metric).one_or_none()
            if not b:
                b = Benchmark(metric=metric)
                s.add(b)
                stats["benchmarks"] += 1
            b.value, b.population, b.source = value, pop, src
        s.commit()
    return stats
