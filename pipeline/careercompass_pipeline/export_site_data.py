"""Export DB → website data files (Option A).

Every course on the site now comes from the database (real institutions, real
programme names, exact URLs, real curricula where parsed/extracted). Careers
keep the one-course-one-path invariant, enforced by an assertion at the end.
Cities are exported from the cities table (verified rents), merged over any
extra city entries already in the app file.

Engine fields the sources don't publish (fit statistics, selectivity, salary)
use per-area estimates anchored to AlmaLaurea/INDIRE benchmarks.
"""
import json
import os
import urllib.parse

from .db import City, Institution, Program, Session

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

# career id → [(institution slug, exact programme name)]
CAREER_MAP = {
    # machines
    "mechatronics": [("its-lomb-mecc", "Factory Automation"), ("its-lomb-mecc", "Process Automation")],
    "robotics-eng": [("polimi", "Automation Engineering"), ("its-rizzoli", "AI & Robotics for Automation Specialist")],
    "auto-tech": [("polito", "Automotive Engineering"), ("its-lomb-mecc", "Automotive Tech Service Engineering")],
    "maint-eng": [("polito", "Mechanical Engineering"), ("polito", "Industrial Manufacturing Technologies")],
    # digital
    "software-dev": [("polimi", "Engineering of Computing Systems"), ("polito", "Computer Engineering"),
                     ("unimib", "Informatica"), ("its-rizzoli", "Software Architect Specialist")],
    "data-analyst": [("polimi", "Mathematical Engineering"), ("polito", "Mathematics for Engineering"),
                     ("unimib", "Scienze Statistiche ed Economiche"), ("its-rizzoli", "Big Data Specialist")],
    "cyber": [("its-rizzoli", "Cyber Defence Specialist")],
    "cloud-tech": [("its-rizzoli", "Network and Cloud Specialist"), ("its-rizzoli", "Cloud Development Operations (DevOps) Specialist")],
    # health
    "nurse": [("unito", "Infermieristica")],
    "biomed-tech": [("polimi", "Biomedical Engineering"), ("polito", "Biomedical Engineering"), ("its-lomb-mecc", "Meccatronica Biomedicale")],
    # design & media
    "ux": [("polimi", "Interaction Design")],
    "graphic": [("polimi", "Communication Design")],
    "industrial-design": [("polimi", "Product Design")],
    "videomaker": [("polito", "Cinema and Digital Media Engineering"), ("its-rizzoli", "Omnichannel Communication Specialist")],
    # business
    "marketing": [("unimib", "Marketing, Comunicazione Aziendale e Mercati Globali"),
                  ("bocconi", "International Economics and Management (BIEM)"), ("its-rizzoli", "Digital Marketing Data Specialist")],
    "fin-analyst": [("bocconi", "International Economics and Finance (BIEF)")],
    "export": [("unimib", "Economia e Commercio")],
    "entrepreneur": [("bocconi", "Economics, Management and Computer Science (BEMACS)")],
    # science & environment
    "renewables": [("polito", "Energy Engineering"), ("polimi", "Energy Engineering"), ("its-energia-pi", "Energy Manager")],
    "env-eng": [("polito", "Environmental and Land Engineering"), ("polimi", "Environmental and Land Planning Engineering"),
                ("its-energia-pi", "Energy & Circular Economy Specialist")],
    "food-tech": [("polito", "Chemical and Food Engineering")],
    "researcher": [("polimi", "Physics Engineering"), ("polito", "Physical Engineering"), ("unimib", "Fisica")],
    # people
    "hr": [("unimib", "Scienze dell'Organizzazione")],
    "teacher": [("unito", "Scienze della formazione primaria"), ("unimib", "Scienze della formazione primaria"),
                ("unito", "Scienze dell'educazione")],
    "tourism": [("unito", "Lingue e culture per il turismo"), ("unimib", "Scienze del turismo e comunità locale")],
    "social-worker": [("unito", "Servizio sociale"), ("unimib", "Servizio sociale")],
    # health (five-careers batch, sourced from the Universitaly catalog)
    "physio": [("unito", "Fisioterapia"), ("unimib", "Fisioterapia"), ("unimi", "Fisioterapia")],
    "psychologist": [("unito", "Scienze e tecniche psicologiche"), ("unimib", "Scienze e tecniche psicologiche"),
                     ("unimi", "Scienze psicologiche per la prevenzione e la cura")],
}

# southern + central expansion (Universitaly catalog, 2026-07-12)
SOUTH = {
    "software-dev": [(s, "Informatica") for s in ("sapienza", "federico2", "unibo", "unifi", "unipa", "uniba")],
    "data-analyst": [("sapienza", "Statistica gestionale"), ("federico2", "Statistica e Tecnologie per l'Analisi dei Dati"),
                     ("unibo", "Scienze statistiche"), ("unifi", "Statistica"),
                     ("unipa", "Statistica e Data Science"), ("uniba", "Scienze statistiche")],
    "nurse": [(s, "Infermieristica") for s in ("sapienza", "federico2", "unibo", "unifi", "unipa", "uniba")],
    "physio": [(s, "Fisioterapia") for s in ("sapienza", "federico2", "unibo", "unifi", "unipa", "uniba")],
    "psychologist": [("sapienza", "Psicologia e processi sociali")] +
                    [(s, "Scienze e tecniche psicologiche") for s in ("federico2", "unibo", "unifi", "unipa", "uniba")],
    "teacher": [(s, "Scienze della formazione primaria") for s in ("sapienza", "unibo", "unifi", "unipa", "uniba")],
    "tourism": [("sapienza", "Scienze del turismo sostenibile"), ("federico2", "Scienze del turismo ad indirizzo manageriale"),
                ("unipa", "Turismo, Territori e Imprese"), ("uniba", "Nuovi turismi")],
    "social-worker": [("sapienza", "Servizio sociale"), ("federico2", "Scienze del servizio sociale"),
                      ("unibo", "Servizio sociale"), ("unifi", "Servizio sociale"), ("unipa", "Servizio sociale"),
                      ("uniba", "Scienze del servizio sociale e sociologia")],
    "marketing": [("federico2", "Economia aziendale"), ("unibo", "Economia aziendale"),
                  ("unipa", "Economia e amministrazione aziendale"), ("uniba", "Economia aziendale")],
    "export": [("sapienza", "Economia e finanza"), ("federico2", "Economia e commercio"),
               ("unibo", "Economia, mercati e istituzioni"), ("unifi", "Economia e commercio")],
    "env-eng": [("sapienza", "Ingegneria per l'Ambiente e il Territorio"), ("federico2", "Civil and Environmental Engineering"),
                ("unibo", "Ingegneria per l'ambiente e il territorio"), ("unifi", "Ingegneria ambientale"),
                ("unipa", "Ingegneria Ambientale per lo Sviluppo Sostenibile")],
    "researcher": [("sapienza", "Fisica"), ("federico2", "Fisica"), ("unibo", "Fisica"),
                   ("unifi", "Fisica e Astrofisica"), ("unipa", "Scienze Fisiche"), ("uniba", "Fisica")],
    "renewables": [("unibo", "Ingegneria dell'energia elettrica")],
}
for cid, entries in SOUTH.items():
    CAREER_MAP[cid] = CAREER_MAP[cid] + entries

# 2026-08 expansion — written by seed_expand from the registry, so course names
# here always match what is actually in the database.
_EXPANDED = os.path.join(os.path.dirname(os.path.abspath(__file__)), "expanded_map.json")
if os.path.exists(_EXPANDED):
    with open(_EXPANDED, encoding="utf-8") as _f:
        for cid, entries in json.load(_f).items():
            CAREER_MAP.setdefault(cid, [])
            CAREER_MAP[cid] = CAREER_MAP[cid] + [tuple(e) for e in entries]

CAREER_TAGS = {
    "mechatronics": ["Machines & hardware", "Building things"],
    "robotics-eng": ["Machines & hardware", "Programming", "Mathematics"],
    "auto-tech": ["Machines & hardware", "Building things"],
    "maint-eng": ["Machines & hardware", "Building things", "Mathematics"],
    "software-dev": ["Programming", "Mathematics", "Science & research"],
    "data-analyst": ["Mathematics", "Programming", "Economics & finance"],
    "cyber": ["Programming", "Building things"],
    "cloud-tech": ["Programming", "Machines & hardware"],
    "nurse": ["Health & body", "People & communication"],
    "biomed-tech": ["Health & body", "Science & research", "Machines & hardware"],
    "ux": ["Design & creativity", "Media & video", "Programming"],
    "graphic": ["Design & creativity", "Media & video"],
    "industrial-design": ["Design & creativity", "Building things"],
    "videomaker": ["Media & video", "Design & creativity", "Programming"],
    "marketing": ["Economics & finance", "People & communication", "Media & video"],
    "fin-analyst": ["Economics & finance", "Mathematics"],
    "export": ["Economics & finance", "People & communication", "Languages & writing"],
    "entrepreneur": ["Economics & finance", "Programming", "People & communication"],
    "renewables": ["Nature & environment", "Machines & hardware", "Mathematics"],
    "env-eng": ["Nature & environment", "Science & research", "Building things"],
    "food-tech": ["Food & hospitality", "Science & research", "Nature & environment"],
    "researcher": ["Science & research", "Mathematics"],
    "hr": ["People & communication", "Law & society", "Economics & finance"],
    "physio": ["Health & body", "Sport & movement", "People & communication"],
    "psychologist": ["Health & body", "People & communication", "Science & research"],
    "teacher": ["Teaching & mentoring", "People & communication", "Languages & writing"],
    "tourism": ["Food & hospitality", "Languages & writing", "People & communication"],
    "social-worker": ["People & communication", "Law & society", "Health & body"],
}

CITY_FALLBACK = {
    "Milano": {"lat": 45.4642, "lon": 9.19, "rent": 664, "size": "large", "vibe": "Big, fast, most opportunities, most expensive"},
    "Torino": {"lat": 45.0703, "lon": 7.6869, "rent": 525, "size": "large", "vibe": "Elegant, livable, strong student scene"},
    "Bologna": {"lat": 44.4949, "lon": 11.3426, "rent": 655, "size": "medium", "vibe": "Italy's classic student city"},
    "Roma": {"lat": 41.9028, "lon": 12.4964, "rent": 600, "size": "large", "vibe": "Huge, historic, chaotic, endless options"},
    "Bergamo": {"lat": 45.6983, "lon": 9.6773, "rent": 450, "size": "small", "vibe": "Quiet, industrial heartland, close-knit"},
    "Lecco": {"lat": 45.8566, "lon": 9.3977, "rent": 430, "size": "small", "vibe": "Lakeside campus town, quiet and outdoorsy"},
    "Cremona": {"lat": 45.1332, "lon": 10.0227, "rent": 380, "size": "small", "vibe": "Small, calm, low cost of living"},
    "Piacenza": {"lat": 45.0526, "lon": 9.6930, "rent": 400, "size": "small", "vibe": "Compact student city between Milano and Bologna"},
    "Mantova": {"lat": 45.1564, "lon": 10.7914, "rent": 380, "size": "small", "vibe": "Renaissance town, small campus community"},
    "Sesto San Giovanni": {"lat": 45.5347, "lon": 9.2405, "rent": 550, "size": "large", "vibe": "Milan's industrial north — metro to the centre"},
    "Monza": {"lat": 45.5845, "lon": 9.2744, "rent": 500, "size": "medium", "vibe": "Green, orderly, a train away from Milan"},
    "Napoli": {"lat": 40.8518, "lon": 14.2681, "rent": 450, "size": "large", "vibe": "Intense, warm, cheapest big city"},
    "Bari": {"lat": 41.1171, "lon": 16.8719, "rent": 400, "size": "medium", "vibe": "Seaside, growing, affordable"},
    "Palermo": {"lat": 38.1157, "lon": 13.3615, "rent": 350, "size": "large", "vibe": "Beautiful, affordable, far from the north"},
    "Firenze": {"lat": 43.7696, "lon": 11.2558, "rent": 620, "size": "medium", "vibe": "Art everywhere, tourist prices"},
    # 2026-08 expansion — approximate single-room rents, city-level living costs
    "Padova": {"lat": 45.4064, "lon": 11.8768, "rent": 400, "size": "medium", "vibe": "Classic student city, everything walkable"},
    "Pisa": {"lat": 43.7228, "lon": 10.4017, "rent": 380, "size": "small", "vibe": "Small, academic, cheap by Tuscan standards"},
    "Genova": {"lat": 44.4056, "lon": 8.9463, "rent": 350, "size": "large", "vibe": "Sea and hills, affordable for a big city"},
    "Verona": {"lat": 45.4384, "lon": 10.9916, "rent": 380, "size": "medium", "vibe": "Elegant, well connected, quietly wealthy"},
    "Trento": {"lat": 46.0748, "lon": 11.1217, "rent": 400, "size": "small", "vibe": "Mountains, high quality of life, strong services"},
    "Pavia": {"lat": 45.1847, "lon": 9.1582, "rent": 380, "size": "small", "vibe": "College-town feel, 30 minutes from Milan"},
    "Parma": {"lat": 44.8015, "lon": 10.3279, "rent": 350, "size": "small", "vibe": "Food capital, compact and liveable"},
    "Catania": {"lat": 37.5079, "lon": 15.0830, "rent": 300, "size": "large", "vibe": "Volcano and sea, lively and inexpensive"},
    "Cagliari": {"lat": 39.2238, "lon": 9.1217, "rent": 330, "size": "medium", "vibe": "Island capital, beaches on the doorstep"},
    "Salerno": {"lat": 40.6824, "lon": 14.7681, "rent": 300, "size": "medium", "vibe": "Seafront, affordable, near the Amalfi coast"},
}

# Verified fee anchors (research workbook, Universities + ISEE_Bands sheets).
INST_FEES = {
    "polimi": {"low": 160, "mid": 1968, "high": 3943},
    "polito": {"low": 156, "mid": 1500, "high": 2800},
    "unimib": {"low": 156, "mid": 1200, "high": 4100},
    "bocconi": {"low": 3000, "mid": 9000, "high": 17000},
    "unito": {"low": 156, "mid": 1400, "high": 2800},
    "unimi": {"low": 156, "mid": 1500, "high": 3500},
    "sapienza": {"low": 156, "mid": 1300, "high": 2900},
    "federico2": {"low": 156, "mid": 1200, "high": 3000},
    "unibo": {"low": 157, "mid": 1600, "high": 3500},
    "unifi": {"low": 156, "mid": 1400, "high": 3000},
    "unipa": {"low": 156, "mid": 1100, "high": 2600},
    "uniba": {"low": 156, "mid": 1200, "high": 2700},
    "unipd": {"low": 190, "mid": 1500, "high": 2900}, "unipi": {"low": 160, "mid": 1300, "high": 2600},
    "unige": {"low": 160, "mid": 1300, "high": 2800}, "univr": {"low": 180, "mid": 1500, "high": 3000},
    "unitn": {"low": 160, "mid": 1600, "high": 3600}, "unipv": {"low": 160, "mid": 1500, "high": 3000},
    "unipr": {"low": 160, "mid": 1400, "high": 2900}, "unict": {"low": 150, "mid": 1100, "high": 2400},
    "unica": {"low": 150, "mid": 1100, "high": 2400}, "unisa": {"low": 150, "mid": 1200, "high": 2500},
    "its-lomb-mecc": {"low": 0, "mid": 0, "high": 0},   # ITS Academy: MIM/ESF funded
    "its-rizzoli": {"low": 0, "mid": 0, "high": 0},
    "its-energia-pi": {"low": 0, "mid": 0, "high": 0},
}
# Ownership: private universities set their own fees/aid (Bocconi via Bocconi4Access)
INST_OWNERSHIP = {"bocconi": "private"}

INST_TEST = {
    "polimi": "TOL (PoliMi admission test)",
    "polito": "TIL-I (PoliTo admission test)",
    "unimib": "TOLC",
    "bocconi": "Bocconi admission test",
    "unito": "TOLC / local admission test",
    "unimi": "TOLC / local admission test",
    "sapienza": "TOLC (CISIA)",
    "federico2": "TOLC (CISIA)",
    "unibo": "TOLC (CISIA)",
    "unifi": "TOLC (CISIA)",
    "unipa": "TOLC (CISIA)",
    "uniba": "TOLC (CISIA)",
    "unipd": "TOLC (CISIA)", "unipi": "TOLC (CISIA)", "unige": "TOLC (CISIA)",
    "univr": "TOLC (CISIA)", "unitn": "TOLC (CISIA)", "unipv": "TOLC (CISIA)",
    "unipr": "TOLC (CISIA)", "unict": "TOLC (CISIA)", "unica": "TOLC (CISIA)",
    "unisa": "TOLC (CISIA)",
    "its-lomb-mecc": "Internal selection test + interview",
    "its-rizzoli": "Internal selection test + interview",
    "its-energia-pi": "Internal selection test + interview",
}

# Per-area estimates anchored to AlmaLaurea 2025 / INDIRE 2025 benchmarks.
AREA = {
    "engineering": {"nature": "scientific", "mathLoad": 5, "selectivity": 82, "employment1y": 93, "salary": 30000,
                    "mastersAccess": 5, "handsOn": 2, "netMonthly": 1700, "dropout": 23,
               "teachSat": 84, "workloadOk": 70, "infraOk": 85, "wouldChooseAgain": 76},
    "design": {"nature": "mixed", "mathLoad": 2, "selectivity": 84, "employment1y": 87, "salary": 25000,
               "mastersAccess": 4, "handsOn": 4, "netMonthly": 1450, "dropout": 16,
        "teachSat": 86, "workloadOk": 75, "infraOk": 84, "wouldChooseAgain": 79},
    "architecture": {"nature": "mixed", "mathLoad": 3, "selectivity": 80, "employment1y": 85, "salary": 24000,
                     "mastersAccess": 5, "handsOn": 3, "netMonthly": 1400, "dropout": 20,
        "teachSat": 83, "workloadOk": 68, "infraOk": 82, "wouldChooseAgain": 72},
    "economics": {"nature": "mixed", "mathLoad": 3, "selectivity": 78, "employment1y": 88, "salary": 27000,
                  "mastersAccess": 5, "handsOn": 2, "netMonthly": 1550, "dropout": 15,
        "teachSat": 85, "workloadOk": 76, "infraOk": 86, "wouldChooseAgain": 78},
    "nursing": {"nature": "mixed", "mathLoad": 2, "selectivity": 75, "employment1y": 95, "salary": 26000,
                "mastersAccess": 2, "handsOn": 5, "netMonthly": 1450, "dropout": 10,
        "teachSat": 83, "workloadOk": 74, "infraOk": 80, "wouldChooseAgain": 80},
    "science": {"nature": "scientific", "mathLoad": 5, "selectivity": 70, "employment1y": 82, "salary": 26000,
                "mastersAccess": 5, "handsOn": 2, "netMonthly": 1500, "dropout": 26,
        "teachSat": 88, "workloadOk": 74, "infraOk": 85, "wouldChooseAgain": 79},
    # ITS: INDIRE 2025 — 84% employed at 1y, 72.6% completion, heavy practice
    "its": {"nature": "technical-practical", "mathLoad": 2, "selectivity": 60, "employment1y": 84, "salary": 26000,
            "mastersAccess": 1, "handsOn": 5, "netMonthly": 1450, "dropout": 27,
        "teachSat": 84, "workloadOk": 82, "infraOk": 83, "wouldChooseAgain": 85},
    # health professions (fisioterapia): near-full employment, tiny national quota
    "healthprof": {"nature": "mixed", "mathLoad": 2, "selectivity": 90, "employment1y": 92, "salary": 27000,
                   "mastersAccess": 2, "handsOn": 5, "netMonthly": 1500, "dropout": 6,
        "teachSat": 88, "workloadOk": 80, "infraOk": 82, "wouldChooseAgain": 86},
    # psychology L-24: profession requires the LM + state exam, most continue
    "psychology": {"nature": "mixed", "mathLoad": 2, "selectivity": 85, "employment1y": 72, "salary": 24000,
                   "mastersAccess": 5, "handsOn": 2, "netMonthly": 1350, "dropout": 12,
        "teachSat": 87, "workloadOk": 78, "infraOk": 83, "wouldChooseAgain": 74},
    # education / formazione primaria: teachers in structural demand
    "education": {"nature": "classical", "mathLoad": 1, "selectivity": 70, "employment1y": 93, "salary": 25000,
                  "mastersAccess": 1, "handsOn": 4, "netMonthly": 1400, "dropout": 10,
        "teachSat": 88, "workloadOk": 80, "infraOk": 81, "wouldChooseAgain": 83},
    "tourism": {"nature": "classical", "mathLoad": 1, "selectivity": 60, "employment1y": 76, "salary": 23000,
                "mastersAccess": 3, "handsOn": 3, "netMonthly": 1300, "dropout": 18,
        "teachSat": 84, "workloadOk": 78, "infraOk": 80, "wouldChooseAgain": 71},
    # servizio sociale L-39: public-sector demand, licensure exam after degree
    "social": {"nature": "classical", "mathLoad": 1, "selectivity": 65, "employment1y": 82, "salary": 23000,
               "mastersAccess": 3, "handsOn": 4, "netMonthly": 1350, "dropout": 12,
        "teachSat": 85, "workloadOk": 77, "infraOk": 79, "wouldChooseAgain": 75},
}

ECON_HINTS = ("Econom", "Management", "Finance", "Marketing", "Organizzazione", "Statistiche", "Business", "Politics")


def area_of(prog, inst_kind):
    if inst_kind == "its":
        return "its"
    name = prog.name
    low = name.lower()
    if "Infermieristica" in name:
        return "nursing"
    if "fisioterapia" in low:
        return "healthprof"
    if "infermieristica" in low:
        return "nursing"
    if "psicolog" in low:
        return "psychology"
    if "formazione primaria" in low or "educazione" in low:
        return "education"
    if "turism" in low:
        return "tourism"
    if "servizio sociale" in low:
        return "social"
    if "statistic" in low or "econom" in low:
        return "economics"
    if low.startswith("fisica") or "astrofisica" in low or low == "scienze fisiche":
        return "science"
    if "Design" in name:
        return "design"
    if "Architect" in name or name.startswith("Urban Planning"):
        return "architecture"
    if any(h in name for h in ECON_HINTS):
        return "economics"
    if name in ("Fisica",):
        return "science"
    return "engineering"


def first_city(campus, default="Milano"):
    if not campus:
        return default
    token = campus.split(",")[0].strip()
    for known in CITY_FALLBACK:
        if token.startswith(known):
            return known
    return default if "Milano" in token else token


def curriculum_of(prog):
    """Real subjects: table-parsed first track, else LLM-extracted themes."""
    tracks = []
    for sub in prog.subjects:
        if sub.track not in tracks:
            tracks.append(sub.track)
    chosen = next((t for t in tracks if t != "llm"), "llm" if "llm" in tracks else None)
    if chosen is None:
        return []
    subs = sorted((s for s in prog.subjects if s.track == chosen), key=lambda x: (x.year or 9, x.name))
    seen, names = set(), []
    for s in subs:
        n = s.name.strip()
        n = clean_subject(n)
        if n.lower() not in seen:
            seen.add(n.lower())
            names.append(n if chosen != "llm" else n.capitalize())
    return names[:8]


import re as _re


def clean_subject(name):
    """PoliTo alternative-course cells concatenate EN/IT variants without a
    separator ("Operating systemsorSistemi operativi") and append UI text
    ("(viewFull curriculum)") — keep the first variant, drop the junk."""
    name = _re.sub(r"\s*\(view.*$", "", name).strip()
    m = _re.match(r"^(.*?[a-zà-ù\)])or[A-ZÀ-Ù]", name)
    if m:
        name = m.group(1).strip()
    return name


def curriculum_by_year(prog):
    """Full study plan grouped by year: {"1": [{name, ects}, ...], ...}.

    Only table-parsed tracks carry reliable years; LLM themes without a year
    are omitted here (they still feed the flat curriculum fallback).
    """
    tracks = []
    for sub in prog.subjects:
        if sub.track not in tracks:
            tracks.append(sub.track)
    chosen = next((t for t in tracks if t != "llm"), None)
    if chosen is None:
        return None
    out = {}
    seen = set()
    for s in sorted((x for x in prog.subjects if x.track == chosen), key=lambda x: (x.year or 9, x.name)):
        if not s.year or s.name.lower() in seen:
            continue
        seen.add(s.name.lower())
        out.setdefault(str(s.year), []).append({"name": clean_subject(s.name), "ects": s.ects})
    return out or None


# ————— Regional adjustment (tester: "is it possible every economics course
# has the same 88% employment?"). We have no per-course AlmaLaurea survey, so
# the base numbers are field averages — but AlmaLaurea consistently reports a
# large employment gap by the university's macro-region (North > Centre >
# South, roughly 10pp at one year, with the same pattern in pay). Applying it
# is more accurate than pretending Palermo and Milano are identical; the site
# labels these as sector averages adjusted for region.
MACRO_REGION = {
    "north": ["Milano", "Torino", "Bergamo", "Lecco", "Cremona", "Mantova", "Monza",
              "Sesto San Giovanni", "Piacenza", "Bologna", "Venezia"],
    "centre": ["Roma", "Firenze"],
    "south": ["Napoli", "Bari", "Palermo"],
}
CITY_MACRO = {city: macro for macro, cities in MACRO_REGION.items() for city in cities}

# employment pp, dropout pp, net pay %, would-choose-again pp
REGION_ADJ = {
    "north": (3, -2, 1.04, 2),
    "centre": (0, 0, 1.00, 0),
    "south": (-7, 3, 0.93, -3),
}


def regional(a, city):
    """Field average adjusted for where the institution actually is."""
    emp_d, drop_d, pay_f, again_d = REGION_ADJ.get(CITY_MACRO.get(city, "centre"))
    return {
        "employment1y": max(35, min(99, a["employment1y"] + emp_d)),
        "dropout": max(3, min(60, a["dropout"] + drop_d)),
        "netMonthly": int(round(a["netMonthly"] * pay_f / 10) * 10),
        "salary": int(round(a["salary"] * pay_f / 100) * 100),
        "wouldChooseAgain": max(40, min(97, a["wouldChooseAgain"] + again_d)),
    }


def build_course(prog, inst, career_id, cities_by_name):
    a = AREA[area_of(prog, inst.kind)]
    city = first_city(prog.campus, default=inst.city or "Milano")
    adj = regional(a, city)
    c = cities_by_name.get(city) or CITY_FALLBACK.get(city) or CITY_FALLBACK["Milano"]
    lang = (prog.language or "ITA").upper()
    return {
        "id": f"{inst.slug}-p{prog.id}",
        "name": prog.name,
        "inst": inst.name,
        "type": "ITS" if inst.kind == "its" else "University",
        "ownership": INST_OWNERSHIP.get(inst.slug, "public"),
        "city": city,
        "lat": c["lat"], "lon": c["lon"],
        "citySize": c["size"],
        "years": prog.years or 3,
        "test": prog.admission_test or INST_TEST[inst.slug],
        "admission": prog.admission_type or ("selection" if inst.kind == "its" else None),
        "selectivity": a["selectivity"],
        "mathLoad": a["mathLoad"],
        "subjects": CAREER_TAGS[career_id],
        "costByIsee": INST_FEES[inst.slug],
        "cityRent": c["rent"],
        "employment1y": adj["employment1y"],
        "salary": adj["salary"],
        "mastersAccess": a["mastersAccess"],
        "handsOn": a["handsOn"],
        "env": {
            "teachSat": a["teachSat"], "workloadOk": a["workloadOk"],
            "infraOk": a["infraOk"], "wouldChooseAgain": adj["wouldChooseAgain"],
            "dropout": adj["dropout"],
            "language": "both" if "ENG" in lang and "ITA" in lang else ("eng" if "ENG" in lang else "ita"),
            "cityVibe": c["vibe"],
        },
        "nature": a["nature"],
        "netMonthly": adj["netMonthly"],
        "curriculum": curriculum_of(prog) or ["Study plan on the official page"],
        "curriculumByYear": curriculum_by_year(prog),
        "googleQuery": urllib.parse.quote(f"{inst.name} {prog.name}"),
        "url": prog.url,
        "curriculumUrl": prog.curriculum_url,
        # source must be a link the card can open; rows curated from the
        # national registry link to the registry search (tester: the old
        # fallback pointed at the university homepage, which explains nothing)
        "dataSource": prog.source if (prog.source or "").startswith("http") else "https://www.universitaly.it/cerca-corsi",
    }


def export_site():
    courses_path = os.path.join(DATA_DIR, "courses-v2.json")
    worlds_path = os.path.join(DATA_DIR, "worlds.json")
    cities_path = os.path.join(DATA_DIR, "cities-v2.json")
    worlds = json.load(open(worlds_path))
    app_cities = json.load(open(cities_path))

    with Session() as s:
        # cities: DB rows (verified rents) override same-slug app entries
        db_cities = s.query(City).all()
        cities_by_name = {}
        merged_cities = {c["id"]: c for c in app_cities}
        for c in db_cities:
            lo = int(round((c.rent_single_room + (c.utilities or 100) - 20 + (c.food or 180) - 30) / 10) * 10)
            hi = int(round((c.rent_single_room + (c.utilities or 100) + 20 + (c.food or 180) + 30 + (c.transport or 25) + 60) / 10) * 10)
            merged_cities[c.slug] = {
                "id": c.slug, "name": c.name, "lat": c.lat, "lon": c.lon, "size": c.size,
                "costRange": [lo, hi], "vibe": c.vibe,
            }
            cities_by_name[c.name] = {"lat": c.lat, "lon": c.lon, "size": c.size, "rent": c.rent_single_room, "vibe": c.vibe}

        insts = {i.slug: i for i in s.query(Institution).all()}
        new_courses, career_courses = [], {}
        for career_id, wanted in CAREER_MAP.items():
            ids = []
            for slug, prog_name in wanted:
                inst = insts.get(slug)
                if not inst:
                    print(f"  ! institution not in DB: {slug}")
                    continue
                prog = (s.query(Program)
                        .filter(Program.institution_id == inst.id, Program.name.ilike(prog_name))
                        .one_or_none())
                if not prog:
                    print(f"  ! no DB match: {slug} / {prog_name}")
                    continue
                course = build_course(prog, inst, career_id, cities_by_name)
                new_courses.append(course)
                ids.append(course["id"])
            career_courses[career_id] = ids

    for w in worlds["worlds"]:
        for career in w["careers"]:
            career["courses"] = career_courses.get(career["id"], [])

    json.dump(new_courses, open(courses_path, "w"), indent=1, ensure_ascii=False)
    json.dump(worlds, open(worlds_path, "w"), indent=1, ensure_ascii=False)
    json.dump(list(merged_cities.values()), open(cities_path, "w"), indent=1, ensure_ascii=False)

    # invariants: every referenced id exists, no course on two careers
    by_id = {c["id"] for c in new_courses}
    seen = {}
    empty = []
    for w in worlds["worlds"]:
        for career in w["careers"]:
            if not career["courses"]:
                empty.append(career["id"])
            for cid in career["courses"]:
                assert cid in by_id, f"career {career['id']} references missing {cid}"
                assert cid not in seen, f"{cid} appears in {seen[cid]} and {career['id']}"
                seen[cid] = career["id"]
    return {"courses": len(new_courses), "cities": len(merged_cities), "careers_without_courses": empty}
