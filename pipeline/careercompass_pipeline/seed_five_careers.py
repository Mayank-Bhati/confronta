"""Seed the five previously-empty careers (physio, psychologist, teacher,
tourism, social-worker) with curated programmes.

Candidates come from the full Universitaly catalog (uni_catalog table, Cineca
API, ingested 2026-07-12): degree classes L/SNT2, L-24, LM-85 bis, L-19, L-15,
L-39 at the Turin/Milan institutions the site already covers, plus Università
degli Studi di Milano (Statale) as a new institution. Access types verified
per-course against the registry's tipoAccesso filter from the Actions runner
(careercompass_pipeline.verify_access), test names from the institutions'
admission pages.

Idempotent: upserts by (institution, url).
"""
from .db import Institution, Program, Session

UNIMI = dict(
    slug="unimi", name="Università degli Studi di Milano",
    kind="university", city="Milano", region="Lombardia",
    website="https://www.unimi.it", no_tax_isee=22000, fee_min=156, fee_max=3500,
)

SOURCE = "Universitaly catalog (Cineca API) + institution admission pages"

# slug, name (display), name_local, degree_class, years, campus, url,
# admission_type, admission_test
PROGRAMS = [
    # --- physiotherapist (L/SNT2: nationally programmed by law) ---
    ("unito", "Fisioterapia", "Fisioterapia (abilitante alla professione sanitaria di Fisioterapista)",
     "L/SNT2", 3, "Torino", "http://medcto.campusnet.unito.it/do/home.pl",
     "national", "National healthcare professions test"),
    ("unimib", "Fisioterapia", "Fisioterapia (abilitante alla professione sanitaria di Fisioterapista)",
     "L/SNT2", 3, "Monza", "https://www.medicina.unimib.it/it",
     "national", "National healthcare professions test"),
    ("unimi", "Fisioterapia", "Fisioterapia (abilitante alla professione sanitaria di Fisioterapista)",
     "L/SNT2", 3, "Milano", "https://fisioterapia.cdl.unimi.it/",
     "national", "National healthcare professions test"),
    # --- psychologist (L-24) ---
    ("unito", "Scienze e tecniche psicologiche", "Scienze e Tecniche psicologiche",
     "L-24", 3, "Torino", "http://www.triennalepsicologia.unito.it/do/home.pl",
     "programmed", "TOLC-PSI (CISIA)"),
    ("unimib", "Scienze e tecniche psicologiche", "Scienze e tecniche psicologiche",
     "L-24", 3, "Milano", "https://didattica.unimib.it/E2403P",
     "programmed", "TOLC-PSI (CISIA)"),
    ("unimi", "Scienze psicologiche per la prevenzione e la cura", "Scienze psicologiche per la prevenzione e la cura",
     "L-24", 3, "Milano", "https://scienze-psicologiche.cdl.unimi.it/it",
     "programmed", "Local admission test"),
    # --- teacher ---
    ("unito", "Scienze della formazione primaria", "Scienze della formazione primaria",
     "LM-85 bis", 5, "Torino", "http://formazioneprimaria.campusnet.unito.it",
     "national", "National primary-education test"),
    ("unimib", "Scienze della formazione primaria", "Scienze della formazione primaria",
     "LM-85 bis", 5, "Milano", "https://www.formazione.unimib.it/didattica/corsi-di-laurea",
     "national", "National primary-education test"),
    ("unito", "Scienze dell'educazione", "Scienze dell'educazione",
     "L-19", 3, "Torino", "http://educazione.campusnet.unito.it/do/home.pl",
     "programmed", "Local admission test"),
    # --- tourism & hospitality ---
    ("unito", "Lingue e culture per il turismo", "Lingue e culture per il turismo",
     "L-15", 3, "Torino", "http://www.lingue.unito.it/",
     "open", "TARM / TOLC-SU (orientation)"),
    ("unimib", "Scienze del turismo e comunità locale", "Scienze del turismo e comunità locale",
     "L-15", 3, "Milano", "https://www.unimib.it/ateneo/dipartimenti/sociologia-e-ricerca-sociale",
     "programmed", "TOLC-SU (CISIA)"),
    # --- social worker (L-39) ---
    ("unito", "Servizio sociale", "Servizio sociale",
     "L-39", 3, "Torino", "http://www.didattica-cps.unito.it/do/home.pl",
     "programmed", "Local admission test"),
    ("unimib", "Servizio sociale", "Servizio Sociale",
     "L-39", 3, "Milano", "https://www.unimib.it/servizio-sociale",
     "programmed", "TOLC-SU (CISIA)"),
]


def seed_five_careers():
    stats = {"institutions": 0, "created": 0, "updated": 0}
    with Session() as s:
        inst = s.query(Institution).filter_by(slug="unimi").one_or_none()
        if not inst:
            inst = Institution(**UNIMI)
            s.add(inst)
            s.flush()
            stats["institutions"] += 1
        insts = {i.slug: i for i in s.query(Institution).all()}
        for slug, name, name_local, dclass, years, campus, url, atype, atest in PROGRAMS:
            owner = insts[slug]
            prog = (s.query(Program)
                    .filter(Program.institution_id == owner.id, Program.url == url)
                    .one_or_none())
            if not prog:
                prog = Program(institution_id=owner.id, url=url)
                s.add(prog)
                stats["created"] += 1
            else:
                stats["updated"] += 1
            prog.name = name
            prog.name_local = name_local
            prog.level = "bachelor"
            prog.degree_class = dclass
            prog.years = years
            prog.campus = campus
            prog.language = "ITA"
            prog.admission_type = atype
            prog.admission_test = atest
            prog.source = SOURCE
        s.commit()
    return stats
