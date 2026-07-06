"""Export DB programmes into the website's data files (Option A).

Replaces the invented PoliMi/PoliTo demo courses in data/courses-v2.json with
real ingested programmes (real names, exact URLs, real curricula) and rewires
data/worlds.json career→course references accordingly. Institutions not yet
ingested (Bicocca, Bocconi, ITS, UniTo) keep their demo entries until their
adapters land.

Engine fields the sources don't publish (fit statistics, selectivity, salary)
use per-area estimates modelled on AlmaLaurea/portal data — same convention as
the original dataset.
"""
import json
import os
import urllib.parse

from .db import Institution, Program, ProgramSubject, Session

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

# career id → [(institution slug, exact programme name)]
CAREER_MAP = {
    "robotics-eng": [("polimi", "Automation Engineering")],
    "auto-tech": [("polito", "Automotive Engineering")],
    "maint-eng": [("polito", "Mechanical Engineering"), ("polito", "Industrial Manufacturing Technologies")],
    "software-dev": [("polimi", "Engineering of Computing Systems"), ("polito", "Computer Engineering")],
    "data-analyst": [("polimi", "Mathematical Engineering"), ("polito", "Mathematics for Engineering")],
    "ux": [("polimi", "Interaction Design")],
    "graphic": [("polimi", "Communication Design")],
    "industrial-design": [("polimi", "Product Design")],
    "videomaker": [("polito", "Cinema and Digital Media Engineering")],
    "biomed-tech": [("polimi", "Biomedical Engineering"), ("polito", "Biomedical Engineering")],
    "renewables": [("polito", "Energy Engineering"), ("polimi", "Energy Engineering")],
    "env-eng": [("polito", "Environmental and Land Engineering"), ("polimi", "Environmental and Land Planning Engineering")],
    "food-tech": [("polito", "Chemical and Food Engineering")],
    "researcher": [("polimi", "Physics Engineering"), ("polito", "Physical Engineering")],
}

CAREER_TAGS = {
    "robotics-eng": ["Machines & hardware", "Programming", "Mathematics"],
    "auto-tech": ["Machines & hardware", "Building things"],
    "maint-eng": ["Machines & hardware", "Building things", "Mathematics"],
    "software-dev": ["Programming", "Mathematics", "Science & research"],
    "data-analyst": ["Mathematics", "Programming", "Economics & finance"],
    "ux": ["Design & creativity", "Media & video", "Programming"],
    "graphic": ["Design & creativity", "Media & video"],
    "industrial-design": ["Design & creativity", "Building things"],
    "videomaker": ["Media & video", "Design & creativity", "Programming"],
    "biomed-tech": ["Health & body", "Science & research", "Machines & hardware"],
    "renewables": ["Nature & environment", "Machines & hardware", "Mathematics"],
    "env-eng": ["Nature & environment", "Science & research", "Building things"],
    "food-tech": ["Food & hospitality", "Science & research", "Nature & environment"],
    "researcher": ["Science & research", "Mathematics"],
}

CITY = {
    "Milano": {"lat": 45.4782, "lon": 9.2272, "rent": 620, "size": "large", "vibe": "Big, fast, expensive, full of opportunities"},
    "Torino": {"lat": 45.0625, "lon": 7.6620, "rent": 450, "size": "large", "vibe": "Elegant, livable, strong industrial tech scene"},
    "Lecco": {"lat": 45.8566, "lon": 9.3977, "rent": 430, "size": "small", "vibe": "Lakeside campus town, quiet and outdoorsy"},
    "Cremona": {"lat": 45.1332, "lon": 10.0227, "rent": 380, "size": "small", "vibe": "Small, calm, low cost of living"},
    "Piacenza": {"lat": 45.0526, "lon": 9.6930, "rent": 400, "size": "small", "vibe": "Compact student city between Milano and Bologna"},
    "Mantova": {"lat": 45.1564, "lon": 10.7914, "rent": 380, "size": "small", "vibe": "Renaissance town, small campus community"},
}

# Verified fee anchors: PoliMi €157→€3,943 (2026/27 fee pages); PoliTo min €600,
# cap per DR 722/2025 regulation (mid/high are estimates pending PDF extraction).
INST_FEES = {
    "polimi": {"low": 160, "mid": 1968, "high": 3943},
    "polito": {"low": 156, "mid": 1500, "high": 2800},
}
INST_TEST = {"polimi": "TOL (PoliMi admission test)", "polito": "TIL-I (PoliTo admission test)"}

AREA = {
    "engineering": {"nature": "scientific", "mathLoad": 5, "selectivity": 82, "employment1y": 93, "salary": 30000,
                    "mastersAccess": 5, "handsOn": 2, "netMonthly": 1700, "dropout": 23},
    "design": {"nature": "mixed", "mathLoad": 2, "selectivity": 84, "employment1y": 87, "salary": 25000,
               "mastersAccess": 4, "handsOn": 4, "netMonthly": 1450, "dropout": 16},
    "architecture": {"nature": "mixed", "mathLoad": 3, "selectivity": 80, "employment1y": 85, "salary": 24000,
                     "mastersAccess": 5, "handsOn": 3, "netMonthly": 1400, "dropout": 20},
}


def area_of(name):
    if "Design" in name:
        return "design"
    if "Architect" in name or name.startswith("Urban Planning") or "Landscape Planning" in name.replace("Land Planning", ""):
        return "architecture"
    return "engineering"


def first_city(campus):
    if not campus:
        return "Milano"
    token = campus.split(",")[0].strip()
    for known in CITY:
        if token.startswith(known):
            return known
    return "Milano" if "Milano" in token else token


def curriculum_of(prog):
    """Real subjects: table-parsed first track, else LLM-extracted themes."""
    tracks = []
    for sub in prog.subjects:
        if sub.track not in tracks:
            tracks.append(sub.track)
    chosen = None
    for t in tracks:
        if t != "llm":
            chosen = t
            break
    if chosen is None and "llm" in tracks:
        chosen = "llm"
    if chosen is None:
        return []
    subs = sorted((s for s in prog.subjects if s.track == chosen), key=lambda x: (x.year or 9, x.name))
    seen, names = set(), []
    for s in subs:
        n = s.name.strip()
        key = n.lower()
        if key not in seen:
            seen.add(key)
            names.append(n if chosen != "llm" else n.capitalize())
    return names[:8]


def build_course(prog, inst_slug, inst_name, career_id):
    a = AREA[area_of(prog.name)]
    city = first_city(prog.campus)
    c = CITY.get(city, CITY["Milano"])
    lang = (prog.language or "ITA").upper()
    return {
        "id": f"{inst_slug}-p{prog.id}",
        "name": prog.name,
        "inst": inst_name,
        "type": "University",
        "city": city,
        "lat": c["lat"], "lon": c["lon"],
        "citySize": c["size"],
        "years": prog.years or 3,
        "test": INST_TEST[inst_slug],
        "selectivity": a["selectivity"],
        "mathLoad": a["mathLoad"],
        "subjects": CAREER_TAGS[career_id],
        "costByIsee": INST_FEES[inst_slug],
        "cityRent": c["rent"],
        "employment1y": a["employment1y"],
        "salary": a["salary"],
        "mastersAccess": a["mastersAccess"],
        "handsOn": a["handsOn"],
        "env": {
            "teachSat": 85, "workloadOk": 72, "infraOk": 86, "wouldChooseAgain": 77,
            "dropout": a["dropout"],
            "language": "both" if "ENG" in lang and "ITA" in lang else ("eng" if "ENG" in lang else "ita"),
            "cityVibe": c["vibe"],
        },
        "nature": a["nature"],
        "netMonthly": a["netMonthly"],
        "curriculum": curriculum_of(prog) or ["Study plan on the official page"],
        "googleQuery": urllib.parse.quote(f"{inst_name} {prog.name}"),
        "url": prog.url,
        "curriculumUrl": prog.curriculum_url,
        "dataSource": prog.source,
    }


def export_site():
    courses_path = os.path.join(DATA_DIR, "courses-v2.json")
    worlds_path = os.path.join(DATA_DIR, "worlds.json")
    courses = json.load(open(courses_path))
    worlds = json.load(open(worlds_path))

    with Session() as s:
        insts = {i.slug: i for i in s.query(Institution).all()}
        new_courses, career_courses = [], {}
        for career_id, wanted in CAREER_MAP.items():
            ids = []
            for slug, prog_name in wanted:
                inst = insts.get(slug)
                if not inst:
                    continue
                prog = (s.query(Program)
                        .filter(Program.institution_id == inst.id, Program.name.ilike(prog_name))
                        .one_or_none())
                if not prog:
                    print(f"  ! no DB match: {slug} / {prog_name}")
                    continue
                course = build_course(prog, slug, inst.name, career_id)
                new_courses.append(course)
                ids.append(course["id"])
            career_courses[career_id] = ids

    # drop old invented PoliMi/PoliTo entries, keep everything else
    kept = [c for c in courses if c["inst"] not in ("Politecnico di Milano", "Politecnico di Torino")]
    merged = kept + new_courses

    removed_ids = {c["id"] for c in courses} - {c["id"] for c in kept}
    for w in worlds["worlds"]:
        for career in w["careers"]:
            existing = [cid for cid in career["courses"] if cid not in removed_ids]
            fresh = career_courses.get(career["id"], [])
            career["courses"] = fresh + existing

    json.dump(merged, open(courses_path, "w"), indent=1, ensure_ascii=False)
    json.dump(worlds, open(worlds_path, "w"), indent=1, ensure_ascii=False)

    # sanity: every referenced id exists, no id in two careers
    by_id = {c["id"] for c in merged}
    seen = {}
    for w in worlds["worlds"]:
        for career in w["careers"]:
            for cid in career["courses"]:
                assert cid in by_id, f"career {career['id']} references missing {cid}"
                assert cid not in seen, f"{cid} appears in {seen[cid]} and {career['id']}"
                seen[cid] = career["id"]
    return {"courses_total": len(merged), "real_courses_added": len(new_courses), "demo_removed": len(removed_ids)}
