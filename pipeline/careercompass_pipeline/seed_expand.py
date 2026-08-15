"""Expand the catalogue to more universities, driven by rules rather than by
hand-typed course lists.

Everything here reads from `uni_catalog` — the official Universitaly registry
already in the database — and writes curated rows into `programs`. The
database stays the single source of truth; nothing is transcribed by hand, so
a course name, degree class or official URL can never drift from the registry.

For each target university and each career the site supports, it picks the
best matching course by degree class + name pattern, and applies the same
admission rules used elsewhere: health professions and primary teaching are
nationally programmed by law, everything else is TOLC-based programmed
admission (the safe direction — a student who over-prepares loses nothing).

    python3 -m careercompass_pipeline.seed_expand
"""
from sqlalchemy import func

from .db import Institution, Program, Session
from .adapters.universitaly import UniCatalogCourse

# slug → (catalogue name, display name, city, region, AlmaLaurea ateneo code,
#         no-tax ISEE threshold, fee floor, fee cap)
UNIVERSITIES = [
    ("unipd", "Università degli Studi di PADOVA", "Università di Padova", "Padova", "Veneto", "70019", 23000, 190, 2900),
    ("unipi", "Università di PISA", "Università di Pisa", "Pisa", "Toscana", "70024", 22000, 160, 2600),
    ("unige", "Università degli Studi di GENOVA", "Università di Genova", "Genova", "Liguria", "70011", 22000, 160, 2800),
    ("univr", "Università degli Studi di VERONA", "Università di Verona", "Verona", "Veneto", "70040", 23000, 180, 3000),
    ("unitn", "Università degli Studi di TRENTO", "Università di Trento", "Trento", "Trentino-Alto Adige", "70062", 25000, 160, 3600),
    ("unipv", "Università degli Studi di PAVIA", "Università di Pavia", "Pavia", "Lombardia", "70022", 23000, 160, 3000),
    ("unipr", "Università degli Studi di PARMA", "Università di Parma", "Parma", "Emilia-Romagna", "70021", 23000, 160, 2900),
    ("unict", "Università degli Studi di CATANIA", "Università di Catania", "Catania", "Sicilia", "70008", 25000, 150, 2400),
    ("unica", "Università degli Studi di CAGLIARI", "Università di Cagliari", "Cagliari", "Sardegna", "70004", 25000, 150, 2400),
    ("unisa", "Università degli Studi di SALERNO", "Università di Salerno", "Salerno", "Campania", "70028", 24000, 150, 2500),
]

NATIONAL_HEALTH = ("national", "National healthcare professions test")
NATIONAL_PRIM = ("national", "National primary-education test")
TOLC_I = ("programmed", "TOLC-I (CISIA)")
TOLC_E = ("programmed", "TOLC-E (CISIA)")
TOLC_S = ("programmed", "TOLC-S (CISIA)")
TOLC_PSI = ("programmed", "TOLC-PSI (CISIA)")
TOLC_SU = ("programmed", "TOLC-SU (CISIA)")
# Medicine, Dentistry and Veterinary no longer use an entrance test. Since the
# 2025 reform you enrol directly into an open first semester ("semestre
# aperto") teaching Chemistry, Physics and Biology at 6 CFU each, sit two exam
# sittings per subject, and MUR builds a national merit ranking from those
# scores to decide who continues into the second semester. Describing this as a
# test would send a student to entirely the wrong preparation, which is exactly
# the kind of error this catalogue exists to avoid.
SEMESTRE_APERTO = ("national", "Semestre aperto — open enrolment, then a national ranking from the first-semester exams")
LMG_FREE = ("open", "Open access (some universities set a non-selective placement test)")

# career → (degree-class prefixes, name must contain one of these, admission)
# Order matters: the first matching course in the registry wins.
CAREER_RULES = [
    # Universities name the same thing differently: Pavia's computing degree is
    # "Artificial intelligence", and most file data careers under L-35
    # Matematica rather than L-41 Statistica. Matching on class alone or on one
    # name would silently drop real courses.
    ("software-dev", ("L-31",), ("informatic", "artificial intelligence",
                                 "intelligenza artificiale", "computer"), TOLC_I),
    ("data-analyst", ("L-41", "L-35"), ("statistic", "matematic", "data science",
                                        "scienze dei dati"), TOLC_E),
    ("nurse", ("L/SNT1",), ("infermieristica",), NATIONAL_HEALTH),
    ("physio", ("L/SNT2",), ("fisioterapia",), NATIONAL_HEALTH),
    ("psychologist", ("L-24",), ("psicolog",), TOLC_PSI),
    ("teacher", ("LM-85 bis",), ("formazione primaria",), NATIONAL_PRIM),
    ("social-worker", ("L-39",), ("servizio sociale",), TOLC_SU),
    ("marketing", ("L-18",), ("economia aziendale", "management", "amministrazione", "economia"), TOLC_E),
    ("export", ("L-33", "L-18"), ("economia e commercio", "economia", "scienze economiche"), TOLC_E),
    ("env-eng", ("L-7",), ("ambiente", "ambientale", "civile"), TOLC_I),
    ("researcher", ("L-30",), ("fisica",), TOLC_S),
    ("tourism", ("L-15",), ("turism",), TOLC_SU),
    # Careers whose institutions were already sitting in uni_catalog unused.
    # Single-cycle degrees (LM-41/46/42/13, LMG/01, LM-4 c.u.) carry no separate
    # triennale, so they are matched on the magistrale class directly.
    ("doctor", ("LM-41",), ("medicina e chirurgia",), SEMESTRE_APERTO),
    ("dentist", ("LM-46",), ("odontoiatria",), SEMESTRE_APERTO),
    ("vet", ("LM-42",), ("veterinaria",), SEMESTRE_APERTO),
    ("pharmacist", ("LM-13",), ("farmacia", "chimica e tecnologia farmaceutiche"), TOLC_S),
    ("lawyer", ("LMG/01",), ("giurisprudenza",), LMG_FREE),
    ("architect", ("LM-4", "L-17"), ("architettura", "scienze dell'architettura"), TOLC_I),
    ("agronomist", ("L-25",), ("agrar", "agricol", "scienze e tecnologie agrarie"), TOLC_S),
    ("sport-scientist", ("L-22",), ("scienze motorie", "sport"), NATIONAL_HEALTH),
    ("translator", ("L-12",), ("mediazione linguistica", "traduzione"), TOLC_SU),
]

SOURCE = "Universitaly catalog (Cineca API) + institution admission pages"


def _pick(session, catalogue_name, classes, needles, taken=()):
    """The best registry match for one career at one university.

    `taken` holds URLs already claimed by an earlier career at this university:
    the site keeps one course on exactly one career path, and Padova (a single
    course simply called "Economia") would otherwise be claimed twice.
    """
    rows = (session.query(UniCatalogCourse)
            .filter(UniCatalogCourse.institution == catalogue_name)
            .all())
    best = []
    for r in rows:
        dc = (r.degree_class or "").strip()
        nm = (r.name or "").strip()
        if not any(dc.startswith(c) for c in classes):
            continue
        if needles and not any(n in nm.lower() for n in needles):
            continue
        if "REPLICA" in nm.upper():          # satellite campus duplicates
            continue
        if not (r.url or "").strip():        # a course we cannot link to is no use
            continue
        if r.url.strip() in taken:
            continue
        best.append(r)
    # shortest name first: "Informatica" beats "Informatica per il management"
    best.sort(key=lambda r: (len(r.name or ""), r.cineca_id))
    return best[0] if best else None


def seed_expand():
    stats = {"institutions": 0, "created": 0, "updated": 0, "no_match": []}
    mapping = {}   # career → [[slug, programme name]] for the site exporter
    with Session() as s:
        for slug, cat_name, display, city, region, ateneo, no_tax, fee_min, fee_max in UNIVERSITIES:
            inst = s.query(Institution).filter_by(slug=slug).one_or_none()
            if not inst:
                inst = Institution(slug=slug, name=display, kind="university", city=city,
                                   region=region, country="IT",
                                   website="", no_tax_isee=no_tax, fee_min=fee_min, fee_max=fee_max)
                s.add(inst)
                s.flush()
                stats["institutions"] += 1

            taken = set()
            for career, classes, needles, (atype, atest) in CAREER_RULES:
                cat = _pick(s, cat_name, classes, needles, taken)
                if not cat:
                    stats["no_match"].append(f"{slug}/{career}")
                    continue
                url = cat.url.strip()
                taken.add(url)
                prog = (s.query(Program)
                        .filter(Program.institution_id == inst.id, Program.url == url)
                        .one_or_none())
                if not prog:
                    prog = Program(institution_id=inst.id, url=url)
                    s.add(prog)
                    stats["created"] += 1
                else:
                    stats["updated"] += 1
                prog.name = cat.name.strip()
                prog.name_local = cat.name.strip()
                prog.level = "bachelor"
                prog.degree_class = (cat.degree_class or "").strip()
                prog.years = int(cat.years) if (cat.years or "").isdigit() else 3
                prog.campus = city
                prog.language = "ENG" if (cat.language or "").upper() == "EN" else "ITA"
                prog.admission_type = atype
                prog.admission_test = atest
                prog.source = SOURCE
                mapping.setdefault(career, []).append([slug, cat.name.strip()])
        s.commit()

    # The exporter needs to know which career each seeded course belongs to.
    # Derived from what we just wrote — the courses themselves stay in the DB.
    import json as _json
    import os as _os
    path = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "expanded_map.json")
    with open(path, "w", encoding="utf-8") as f:
        _json.dump(mapping, f, indent=1, ensure_ascii=False)
    stats["map_file"] = path
    return stats


if __name__ == "__main__":
    print(seed_expand())
