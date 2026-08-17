"""Seed music and art paths from the AFAM registry.

AFAM — Alta Formazione Artistica, Musicale e Coreutica — is a separate legal
sector from universities and from ITS. Conservatori and accademie di belle arti
award "diplomi accademici" (class codes like DCPL08), and a student who wants to
play or paint for a living goes there, not to a university. The site had none of
it, so the survey could route a strongly artistic student only to UX design.

Everything here reads `afam_catalog`, the official Cineca registry rows, and
writes curated programmes exactly like seed_expand does for universities.

Two honest limits, both surfaced in the UI rather than papered over:

  * AlmaLaurea does not survey AFAM. Its 2012 agreement with 21 institutions is
    listed on its own site as "in fase di rinnovo e rilancio" with no members,
    so there are no employment or satisfaction figures for any of these courses
    and there is no substitute source. They carry outcome status "afam".

  * Conservatorio fees are set per institution and are not in this registry.
    Rather than model them from university figures, these institutions carry no
    fee band at all and the card says to check the official page.

    python3 main.py seed-afam
"""
from .db import Institution, Program, Session
from .adapters.universitaly import AfamCatalogCourse

# Only cities the site already models, so distance, rent and commuting figures
# stay real. Registry city values are upper case.
CITY_REGION = {
    "MILANO": ("Milano", "Lombardia"),
    "ROMA": ("Roma", "Lazio"),
    "TORINO": ("Torino", "Piemonte"),
    "BOLOGNA": ("Bologna", "Emilia-Romagna"),
    "FIRENZE": ("Firenze", "Toscana"),
    "NAPOLI": ("Napoli", "Campania"),
    "VENEZIA": ("Venezia", "Veneto"),
    "PALERMO": ("Palermo", "Sicilia"),
    "BARI": ("Bari", "Puglia"),
    "BERGAMO": ("Bergamo", "Lombardia"),
}

# Admission to a conservatorio or accademia is by audition or portfolio — the
# thing a student most needs to know, and nothing like a TOLC.
AUDITION = ("selection", "Entrance audition (esame di ammissione)")
PORTFOLIO = ("selection", "Portfolio review and entrance exam")

# career → (name patterns, admission). First match wins, one course per
# (career, institution), shortest name preferred — same rule as seed_expand.
CAREER_RULES = [
    ("musician", ("pianoforte", "violino", "canto", "chitarra", "violoncello",
                  "flauto", "clarinetto", "tromba", "arpa", "percussioni"), AUDITION),
    ("music-producer", ("composizione", "musica elettronica", "jazz",
                        "musica applicata", "tecnico del suono"), AUDITION),
    ("fine-artist", ("pittura", "scultura", "decorazione", "arti visive"), PORTFOLIO),
    ("art-designer", ("design", "fashion", "grafica", "scenografia",
                      "nuove tecnologie dell'arte", "fotografia"), PORTFOLIO),
]

SOURCE = "AFAM registry (Universitaly / Cineca API)"


def _slug(institution):
    """A stable short slug for an AFAM institution."""
    i = institution.upper()
    city = next((c for c in CITY_REGION if c in i), "")
    if "CONSERVATORIO" in i or "MUSIC" in i:
        kind = "cons"
    elif "BELLE ARTI" in i:
        kind = "aba"
    elif "ISIA" in i:
        kind = "isia"
    else:
        kind = "afam"
    return f"{kind}-{city.lower().replace(' ', '')}"[:64]


def seed_afam():
    stats = {"institutions": 0, "created": 0, "updated": 0, "careers": {}}
    with Session() as s:
        rows = s.query(AfamCatalogCourse).all()
        # group registry rows by the institution slug we will create
        by_inst = {}
        for r in rows:
            city = (r.city or "").strip().upper()
            if city not in CITY_REGION:
                continue
            if (r.degree_type or "") != "Triennale":   # entry level for a school-leaver
                continue
            if not (r.url or "").strip():
                continue
            by_inst.setdefault((_slug(r.institution), r.institution, city), []).append(r)

        for (slug, full_name, city_key), courses in sorted(by_inst.items()):
            city, region = CITY_REGION[city_key]
            inst = s.query(Institution).filter_by(slug=slug).one_or_none()
            if not inst:
                inst = Institution(slug=slug, kind="afam", country="IT")
                s.add(inst)
                stats["institutions"] += 1
            inst.name = full_name.title().replace("Di ", "di ").replace("Del ", "del ")
            inst.city, inst.region = city, region
            # no_tax_isee / fee_min / fee_max stay None on purpose: AFAM fees are
            # not in this registry and must not be modelled from university ones
            s.flush()

            taken = set()
            for career, needles, (atype, atest) in CAREER_RULES:
                best = [c for c in courses
                        if any(n in (c.name or "").lower() for n in needles)
                        and c.url not in taken]
                if not best:
                    continue
                best.sort(key=lambda c: (len(c.name or ""), c.cineca_id))
                cat = best[0]
                taken.add(cat.url)
                prog = s.query(Program).filter_by(institution_id=inst.id, url=cat.url).one_or_none()
                if not prog:
                    prog = Program(institution_id=inst.id, url=cat.url, name=(cat.name or "").strip().title())
                    s.add(prog)
                    stats["created"] += 1
                else:
                    stats["updated"] += 1
                prog.name = (cat.name or "").strip().title()
                prog.name_local = prog.name
                prog.level = "bachelor"
                prog.degree_class = (cat.degree_class or "").strip()
                prog.years = int(cat.years) if (cat.years or "").isdigit() else 3
                prog.campus = city
                prog.language = "ITA"
                prog.admission_type = atype
                prog.admission_test = atest
                prog.source = SOURCE
                stats["careers"].setdefault(career, []).append([slug, prog.name])
        s.commit()

    # The exporter needs the career→course mapping, and a separate CI job runs
    # it from a fresh checkout, so this is written to a tracked path rather than
    # left inside a runner (which silently cost a whole export cycle before).
    import json as _json, os as _os
    path = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "afam_map.json")
    with open(path, "w", encoding="utf-8") as f:
        _json.dump(stats["careers"], f, indent=1, ensure_ascii=False)
    stats["map_file"] = path
    return stats


if __name__ == "__main__":
    print(seed_afam())
