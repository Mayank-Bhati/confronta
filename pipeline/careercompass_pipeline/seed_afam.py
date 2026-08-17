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
import re

from .db import Institution, Program, Session
from .adapters.universitaly import AfamCatalogCourse

# Only cities the site already models, so distance, rent and commuting figures
# stay real. Registry city values are upper case.
# Every city the exporter has verified cost and coordinate data for. Limiting
# this to ten was my own constraint, not a limit in the data: the registry has
# public AFAM institutions in fourteen of them, and Cremona and Piacenza — both
# conservatorio towns — were sitting in the table unused.
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
    "BRESCIA": ("Brescia", "Lombardia"),
    "CREMONA": ("Cremona", "Lombardia"),
    "PIACENZA": ("Piacenza", "Emilia-Romagna"),
    "PARMA": ("Parma", "Emilia-Romagna"),
    "VERONA": ("Verona", "Veneto"),
    "PADOVA": ("Padova", "Veneto"),
    "CAGLIARI": ("Cagliari", "Sardegna"),
    "CATANIA": ("Catania", "Sicilia"),
    "GENOVA": ("Genova", "Liguria"),
    "PISA": ("Pisa", "Toscana"),
    "TRENTO": ("Trento", "Trentino-Alto Adige"),
    "PAVIA": ("Pavia", "Lombardia"),
    "SALERNO": ("Salerno", "Campania"),
    "MONZA": ("Monza", "Lombardia"),
    "LECCO": ("Lecco", "Lombardia"),
    "MANTOVA": ("Mantova", "Lombardia"),
}

# Admission to a conservatorio or accademia is by audition or portfolio — the
# thing a student most needs to know, and nothing like a TOLC.
AUDITION = ("selection", "Entrance audition (esame di ammissione)")
PORTFOLIO = ("selection", "Portfolio review and entrance exam")

# career → (name patterns, admission). First match wins, one course per
# (career, institution), shortest name preferred — same rule as seed_expand.
CAREER_RULES = [
    # Producer runs before performer. Nearly every jazz course is named for an
    # instrument ("Canto jazz", "Chitarra jazz"), so with performer first the
    # performer rule swallowed them and composition was left with two courses
    # nationwide. Composition and studio work are matched first; whatever is
    # left over is a performance course, which is the honest reading anyway.
    ("music-producer", ("composizione", "musica elettronica", "tecnico del suono",
                        "musica applicata", "jazz"), AUDITION),
    ("musician", ("pianoforte", "canto", "violino", "chitarra", "violoncello",
                  "flauto", "clarinetto", "tromba", "percussioni", "arpa",
                  "oboe", "fagotto", "viola", "contrabbasso", "organo",
                  "fisarmonica", "saxofono", "sassofono"), AUDITION),
    ("fine-artist", ("pittura", "scultura", "decorazione", "arti visive"), PORTFOLIO),
    ("art-designer", ("design", "fashion", "grafica", "scenografia",
                      "nuove tecnologie dell'arte", "fotografia"), PORTFOLIO),
]

SOURCE = "AFAM registry (Universitaly / Cineca API)"


def _slug(institution, city_key):
    """A slug unique to the institution, not merely to its city.

    Deriving it from a city name found inside the title collapsed every
    accademia in Milan onto one slug and gave every institution with no city in
    its name the shared slug "afam-", merging separate schools into one. The
    city comes from the registry field we already filter on; the discriminator
    comes from the institution's own name.
    """
    i = institution.upper()
    kind = ("cons" if ("CONSERVATORIO" in i or "STUDI MUSICALI" in i)
            else "aba" if "BELLE ARTI" in i
            else "isia" if "ISIA" in i
            else "afam")
    stop = {"CONSERVATORIO", "DI", "MUSICA", "ACCADEMIA", "BELLE", "ARTI",
            "STATALE", "ISTITUTO", "SUPERIORE", "STUDI", "MUSICALI", "DELLE",
            "DELL", "DEL", "DELLA", "E", "SEDE", "DECENTRATA", "LEGALMENTE",
            "RICONOSCIUTO", city_key}
    words = [w for w in re.split(r"[^A-Z0-9]+", i) if w and w not in stop]
    tail = ("-" + words[0].lower()[:12]) if words else ""
    return f"{kind}-{city_key.lower().replace(' ', '')}{tail}"[:64]


# Only the public sector. Private academies (Accademia del Lusso, and similar)
# charge several thousand a year against a conservatorio's few hundred, and the
# registry carries no fees at all, so listing them beside statali with no price
# would mislead precisely the students least able to absorb the surprise.
def _is_public(institution):
    i = institution.upper()
    # "Legalmente riconosciuta" means state-recognised, not state-run: NABA,
    # RUFA and the like award valid diplomi accademici but charge private-school
    # fees. The first filter let them through on the words "Accademia di Belle
    # Arti" alone, which is exactly the pairing a student cannot afford to
    # misread when no fee is shown.
    if "LEGALMENTE RICONOSCIUT" in i or "LEG. RICON" in i:
        return False
    return (("CONSERVATORIO" in i and "MUSICA" in i)
            or "ACCADEMIA DI BELLE ARTI" in i
            or "ISIA" in i
            or "ISTITUTO SUPERIORE DI STUDI MUSICALI" in i)


def seed_afam():
    stats = {"institutions": 0, "created": 0, "updated": 0, "removed": 0, "careers": {}}
    with Session() as s:
        # The first run merged distinct schools onto shared slugs, so start from
        # a clean sector rather than upserting on top of wrong identities.
        stale = s.query(Institution).filter(Institution.kind == "afam").all()
        for inst in stale:
            for prog in list(inst.programs):
                s.delete(prog)
            s.delete(inst)
            stats["removed"] += 1
        s.flush()
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
            if not _is_public(r.institution):
                continue
            by_inst.setdefault((_slug(r.institution, city), r.institution, city), []).append(r)

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

            taken = set()   # cineca ids, not URLs: see below
            for career, needles, (atype, atest) in CAREER_RULES:
                def rank(c):
                    nm = (c.name or "").lower()
                    pos = next((i for i, n in enumerate(needles) if n in nm), len(needles))
                    return (pos, len(nm), c.cineca_id)
                best = [c for c in courses
                        if any(n in (c.name or "").lower() for n in needles)
                        and c.cineca_id not in taken]
                if not best:
                    continue
                best.sort(key=rank)
                cat = best[0]
                taken.add(cat.cineca_id)
                # Every AFAM row carries the institution's homepage as its URL —
                # all 53 Bologna courses share http://www.consbo.it — and
                # Program is unique on (institution_id, url). So a conservatorio
                # could hold exactly one course, and the second career onwards
                # found nothing. The fragment keeps the link landing on the real
                # official page while giving each course its own identity.
                url = f"{cat.url}#corso-{cat.cineca_id}"
                prog = s.query(Program).filter_by(institution_id=inst.id, url=url).one_or_none()
                if not prog:
                    prog = Program(institution_id=inst.id, url=url, name=(cat.name or "").strip().title())
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
