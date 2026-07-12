"""Southern + central Italy expansion: Sapienza (Roma), Federico II (Napoli),
UniBo (Bologna), UniFi (Firenze), UniPa (Palermo), UniBa (Bari).

Course identity (name, class, years, language, official URL) comes straight
from the uni_catalog table (official Universitaly registry, ingested
2026-07-12) — matched by exact nomeCorso, never hand-typed. Admission types
are curated with the same rules as seed_admissions/seed_five_careers:
health professions and formazione primaria are nationally programmed by law;
large-university STEM/economics/psychology use programmed TOLC admission
(the safe error direction — a student who over-prepares loses nothing).

Idempotent: upserts by (institution, url).
"""
from sqlalchemy import func

from .db import Institution, Program, Session
from .adapters.universitaly import UniCatalogCourse

INSTITUTIONS = [
    dict(slug="sapienza", name="Sapienza Università di Roma", kind="university",
         city="Roma", region="Lazio", website="https://www.uniroma1.it",
         no_tax_isee=24000, fee_min=156, fee_max=2900),
    dict(slug="federico2", name="Università di Napoli Federico II", kind="university",
         city="Napoli", region="Campania", website="https://www.unina.it",
         no_tax_isee=22000, fee_min=156, fee_max=3000),
    dict(slug="unibo", name="Università di Bologna", kind="university",
         city="Bologna", region="Emilia-Romagna", website="https://www.unibo.it",
         no_tax_isee=23000, fee_min=157, fee_max=3500),
    dict(slug="unifi", name="Università degli Studi di Firenze", kind="university",
         city="Firenze", region="Toscana", website="https://www.unifi.it",
         no_tax_isee=22000, fee_min=156, fee_max=3000),
    dict(slug="unipa", name="Università degli Studi di Palermo", kind="university",
         city="Palermo", region="Sicilia", website="https://www.unipa.it",
         no_tax_isee=25000, fee_min=156, fee_max=2600),
    dict(slug="uniba", name="Università degli Studi di Bari Aldo Moro", kind="university",
         city="Bari", region="Puglia", website="https://www.uniba.it",
         no_tax_isee=23000, fee_min=156, fee_max=2700),
]

# catalog institution names (exact, from uni_catalog)
CATALOG_NAME = {
    "sapienza": 'Università degli Studi di ROMA "La Sapienza"',
    "federico2": 'Università degli Studi di Napoli Federico II',
    "unibo": 'Alma Mater Studiorum - Università di BOLOGNA',
    "unifi": 'Università degli Studi di FIRENZE',
    "unipa": 'Università degli Studi di PALERMO',
    "uniba": 'Università degli Studi di BARI ALDO MORO',
}

NATIONAL_HEALTH = ("national", "National healthcare professions test")
NATIONAL_PRIM = ("national", "National primary-education test")
TOLC_I = ("programmed", "TOLC-I (CISIA)")
TOLC_E = ("programmed", "TOLC-E (CISIA)")
TOLC_S = ("programmed", "TOLC-S (CISIA)")
TOLC_PSI = ("programmed", "TOLC-PSI (CISIA)")
TOLC_SU = ("programmed", "TOLC-SU (CISIA)")

# slug, catalog nomeCorso (exact), display name, campus, (admission, test)
PROGRAMS = [
    # ---- Sapienza · Roma ----
    ("sapienza", "Informatica", "Informatica", "Roma", TOLC_I),
    ("sapienza", "Statistica gestionale", "Statistica gestionale", "Roma", TOLC_E),
    ("sapienza", "Infermieristica (abilitante alla professione sanitaria di Infermiere)", "Infermieristica", "Roma", NATIONAL_HEALTH),
    ("sapienza", "Fisioterapia (abilitante alla professione sanitaria di Fisioterapista)", "Fisioterapia", "Roma", NATIONAL_HEALTH),
    ("sapienza", "Psicologia e processi sociali", "Psicologia e processi sociali", "Roma", TOLC_PSI),
    ("sapienza", "Scienze della formazione primaria", "Scienze della formazione primaria", "Roma", NATIONAL_PRIM),
    ("sapienza", "Scienze del turismo sostenibile", "Scienze del turismo sostenibile", "Roma", TOLC_SU),
    ("sapienza", "Servizio Sociale", "Servizio sociale", "Roma", TOLC_SU),
    ("sapienza", "Ingegneria per l'Ambiente e il Territorio", "Ingegneria per l'Ambiente e il Territorio", "Roma", TOLC_I),
    ("sapienza", "Fisica", "Fisica", "Roma", TOLC_S),
    ("sapienza", "Economia e finanza", "Economia e finanza", "Roma", TOLC_E),
    # ---- Federico II · Napoli ----
    ("federico2", "Informatica", "Informatica", "Napoli", TOLC_I),
    ("federico2", "Statistica e Tecnologie per l'Analisi dei Dati", "Statistica e Tecnologie per l'Analisi dei Dati", "Napoli", TOLC_E),
    ("federico2", "Infermieristica (abilitante alla professione sanitaria di Infermiere)", "Infermieristica", "Napoli", NATIONAL_HEALTH),
    ("federico2", "Fisioterapia (abilitante alla professione sanitaria di Fisioterapista)", "Fisioterapia", "Napoli", NATIONAL_HEALTH),
    ("federico2", "Scienze e Tecniche Psicologiche", "Scienze e tecniche psicologiche", "Napoli", TOLC_PSI),
    ("federico2", "Scienze del turismo ad indirizzo manageriale", "Scienze del turismo ad indirizzo manageriale", "Napoli", TOLC_SU),
    ("federico2", "Scienze del servizio sociale", "Scienze del servizio sociale", "Napoli", TOLC_SU),
    ("federico2", "Economia Aziendale", "Economia aziendale", "Napoli", TOLC_E),
    ("federico2", "Economia e Commercio", "Economia e commercio", "Napoli", TOLC_E),
    ("federico2", "Civil and environmental engineering", "Civil and Environmental Engineering", "Napoli", TOLC_I),
    ("federico2", "Fisica", "Fisica", "Napoli", TOLC_S),
    # ---- UniBo · Bologna ----
    ("unibo", "Informatica", "Informatica", "Bologna", TOLC_I),
    ("unibo", "Scienze Statistiche", "Scienze statistiche", "Bologna", TOLC_E),
    ("unibo", "Infermieristica (abilitante alla professione sanitaria di Infermiere)", "Infermieristica", "Bologna", NATIONAL_HEALTH),
    ("unibo", "Fisioterapia (abilitante alla professione sanitaria di Fisioterapista)", "Fisioterapia", "Bologna", NATIONAL_HEALTH),
    ("unibo", "Scienze e tecniche psicologiche", "Scienze e tecniche psicologiche", "Bologna", TOLC_PSI),
    ("unibo", "Scienze della formazione primaria", "Scienze della formazione primaria", "Bologna", NATIONAL_PRIM),
    ("unibo", "SERVIZIO SOCIALE", "Servizio sociale", "Bologna", TOLC_SU),
    ("unibo", "Economia Aziendale", "Economia aziendale", "Bologna", TOLC_E),
    ("unibo", "Economia, mercati e istituzioni", "Economia, mercati e istituzioni", "Bologna", TOLC_E),
    ("unibo", "Ingegneria  per l'ambiente e il territorio", "Ingegneria per l'ambiente e il territorio", "Bologna", TOLC_I),
    ("unibo", "Fisica", "Fisica", "Bologna", TOLC_S),
    ("unibo", "Ingegneria dell'energia elettrica", "Ingegneria dell'energia elettrica", "Bologna", TOLC_I),
    # ---- UniFi · Firenze ----
    ("unifi", "Informatica", "Informatica", "Firenze", TOLC_I),
    ("unifi", "Statistica", "Statistica", "Firenze", TOLC_E),
    ("unifi", "Infermieristica (abilitante alla professione sanitaria di Infermiere)", "Infermieristica", "Firenze", NATIONAL_HEALTH),
    ("unifi", "Fisioterapia (abilitante alla professione sanitaria di Fisioterapista)", "Fisioterapia", "Firenze", NATIONAL_HEALTH),
    ("unifi", "Scienze e tecniche psicologiche", "Scienze e tecniche psicologiche", "Firenze", TOLC_PSI),
    ("unifi", "Scienze della formazione primaria", "Scienze della formazione primaria", "Firenze", NATIONAL_PRIM),
    ("unifi", "Servizio sociale", "Servizio sociale", "Firenze", TOLC_SU),
    ("unifi", "Economia e commercio", "Economia e commercio", "Firenze", TOLC_E),
    ("unifi", "INGEGNERIA AMBIENTALE", "Ingegneria ambientale", "Firenze", TOLC_I),
    ("unifi", "Fisica e Astrofisica", "Fisica e Astrofisica", "Firenze", TOLC_S),
    # ---- UniPa · Palermo ----
    ("unipa", "Informatica", "Informatica", "Palermo", TOLC_I),
    ("unipa", "Statistica e Data Science", "Statistica e Data Science", "Palermo", TOLC_E),
    ("unipa", "Infermieristica (abilitante alla professione sanitaria di Infermiere)", "Infermieristica", "Palermo", NATIONAL_HEALTH),
    ("unipa", "Fisioterapia (abilitante alla professione sanitaria di Fisioterapista)", "Fisioterapia", "Palermo", NATIONAL_HEALTH),
    ("unipa", "Scienze e tecniche psicologiche", "Scienze e tecniche psicologiche", "Palermo", TOLC_PSI),
    ("unipa", "Scienze della formazione primaria", "Scienze della formazione primaria", "Palermo", NATIONAL_PRIM),
    ("unipa", "Turismo, Territori e Imprese", "Turismo, Territori e Imprese", "Palermo", TOLC_SU),
    ("unipa", "Servizio Sociale", "Servizio sociale", "Palermo", TOLC_SU),
    ("unipa", "Economia e amministrazione aziendale", "Economia e amministrazione aziendale", "Palermo", TOLC_E),
    ("unipa", "Ingegneria Ambientale per lo Sviluppo Sostenibile", "Ingegneria Ambientale per lo Sviluppo Sostenibile", "Palermo", TOLC_I),
    ("unipa", "Scienze Fisiche", "Scienze Fisiche", "Palermo", TOLC_S),
    # ---- UniBa · Bari ----
    ("uniba", "Informatica", "Informatica", "Bari", TOLC_I),
    ("uniba", "Scienze statistiche", "Scienze statistiche", "Bari", TOLC_E),
    ("uniba", "Infermieristica (abilitante alla professione sanitaria di Infermiere)", "Infermieristica", "Bari", NATIONAL_HEALTH),
    ("uniba", "Fisioterapia (abilitante alla professione sanitaria di Fisioterapista)", "Fisioterapia", "Bari", NATIONAL_HEALTH),
    ("uniba", "Scienze e tecniche psicologiche", "Scienze e tecniche psicologiche", "Bari", TOLC_PSI),
    ("uniba", "Scienze della formazione primaria", "Scienze della formazione primaria", "Bari", NATIONAL_PRIM),
    ("uniba", "Nuovi turismi", "Nuovi turismi", "Bari", TOLC_SU),
    ("uniba", "SCIENZE DEL SERVIZIO SOCIALE E SOCIOLOGIA", "Scienze del servizio sociale e sociologia", "Bari", TOLC_SU),
    ("uniba", "ECONOMIA AZIENDALE", "Economia aziendale", "Bari", TOLC_E),
    ("uniba", "Fisica", "Fisica", "Bari", TOLC_S),
]

SOURCE = "Universitaly catalog (Cineca API) + institution admission pages"


def seed_south():
    stats = {"institutions": 0, "created": 0, "updated": 0, "missing": []}
    with Session() as s:
        for spec in INSTITUTIONS:
            if not s.query(Institution).filter_by(slug=spec["slug"]).one_or_none():
                s.add(Institution(**spec))
                stats["institutions"] += 1
        s.flush()
        insts = {i.slug: i for i in s.query(Institution).all()}

        for slug, cat_name, display, campus, (atype, atest) in PROGRAMS:
            rows = (s.query(UniCatalogCourse)
                    .filter(UniCatalogCourse.institution == CATALOG_NAME[slug],
                            func.trim(UniCatalogCourse.name) == cat_name)
                    .all())
            rows = [r for r in rows if "REPLICA" not in (r.name or "")]
            if not rows:
                stats["missing"].append(f"{slug}/{cat_name}")
                continue
            cat = sorted(rows, key=lambda r: r.cineca_id)[0]
            url = (cat.url or "").strip()
            if not url:
                stats["missing"].append(f"{slug}/{cat_name} (no url)")
                continue
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
            prog.name = display
            prog.name_local = cat.name
            prog.level = "bachelor"
            prog.degree_class = (cat.degree_class or "").strip()
            prog.years = int(cat.years) if (cat.years or "").isdigit() else 3
            prog.campus = campus
            prog.language = "ENG" if cat.language == "EN" else "ITA"
            prog.admission_type = atype
            prog.admission_test = atest
            prog.source = SOURCE
        s.commit()
    return stats
