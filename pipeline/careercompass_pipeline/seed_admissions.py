"""Curated admission data (numero chiuso / test) per programme.

Universitaly — the authoritative per-course access registry — is WAF-blocked
from this network (HTTP 202 challenge); until the EU-hosted runner can pull it,
these values come from the institutions' own admission pages. Rules are
per-institution with per-programme overrides.

Sources:
  PoliMi  https://www.polimi.it/en/prospective-students/how-to-apply
  PoliTo  https://www.polito.it/en/education/enrolling/admission-to-bachelor-s-degree-programmes
  Bicocca https://www.unimib.it/servizi/segreterie-studenti/immatricolazioni
  Bocconi https://www.unibocconi.it/en/applying-bocconi
  UniTo   https://www.unito.it/didattica/immatricolazioni-e-iscrizioni
  ITS     foundation sites (internal selection + motivational interview)
"""
from .db import Institution, Program, Session

# institution defaults: (admission_type, admission_test)
INST_DEFAULT = {
    "polimi": ("programmed", "TOL (PoliMi test)"),
    "polito": ("programmed", "TIL-I (PoliTo test)"),
    "unimib": ("open", "TOLC (CISIA)"),
    "bocconi": ("programmed", "Bocconi admission test"),
    "unito": ("programmed", "Local/TOLC admission test"),
    "its-lomb-mecc": ("selection", "Internal test + interview"),
    "its-rizzoli": ("selection", "Internal test + interview"),
    "its-energia-pi": ("selection", "Internal test + interview"),
}

# per-programme overrides: (inst slug, name contains) → (type, test)
OVERRIDES = [
    # PoliMi non-engineering tests
    ("polimi", "Design", ("programmed", "TOL-D (PoliMi design test)")),
    ("polimi", "Architectural", ("programmed", "Arched test")),
    ("polimi", "Urban Planning", ("programmed", "Arched test")),
    ("polimi", "Building Engineering/Architecture", ("programmed", "Arched test")),
    # PoliTo non-engineering
    ("polito", "Architecture", ("programmed", "TIL-A (PoliTo test)")),
    ("polito", "Territorial", ("programmed", "TIL-P (PoliTo test)")),
    ("polito", "Design and Communication", ("programmed", "TIL-D (PoliTo test)")),
    # Bicocca: capped STEM/economics programmes (CISIA TOLC)
    ("unimib", "Informatica", ("programmed", "TOLC-I (CISIA)")),
    ("unimib", "Economia e Commercio", ("programmed", "TOLC-E (CISIA)")),
    ("unimib", "Marketing", ("programmed", "TOLC-E (CISIA)")),
    ("unimib", "Fisica", ("open", "TOLC-S (CISIA), non-selective")),
    ("unimib", "Scienze Statistiche", ("open", "TOLC-E (CISIA), non-selective")),
    ("unimib", "Scienze dell'Organizzazione", ("open", "TOLC-E (CISIA), non-selective")),
    # UniTo healthcare: nationally programmed
    ("unito", "Infermieristica", ("national", "National healthcare admission test")),
]


def seed_admissions():
    stats = {"updated": 0}
    with Session() as s:
        insts = {i.id: i.slug for i in s.query(Institution).all()}
        for prog in s.query(Program).all():
            slug = insts.get(prog.institution_id)
            if slug not in INST_DEFAULT:
                continue
            atype, atest = INST_DEFAULT[slug]
            for oslug, needle, (t2, test2) in OVERRIDES:
                if oslug == slug and needle.lower() in prog.name.lower():
                    atype, atest = t2, test2
                    break
            prog.admission_type = atype
            prog.admission_test = atest
            stats["updated"] += 1
        s.commit()
    return stats
