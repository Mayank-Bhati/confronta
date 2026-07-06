"""Politecnico di Milano adapter.

The catalog page exposes exact per-programme URLs. Year-by-year study plans
live in the "Manifesto degli Studi" web application (aunicalogin.polimi.it,
per-programme numeric id) — a dedicated extractor or the LLM step handles
those in a later iteration; for now we ingest programme rows with exact URLs
and the subject THEMES visible on the overview page.
"""
import re
from datetime import datetime

from bs4 import BeautifulSoup

from ..db import Institution, Program, Session
from ..http import fetch

CATALOG = "https://www.polimi.it/en/education/laurea-programmes"
DETAIL_RE = re.compile(r"/en/education/laurea-programmes/programme-detail/[a-z0-9-]+$")


def ensure_institution(s):
    inst = s.query(Institution).filter_by(slug="polimi").one_or_none()
    if not inst:
        inst = Institution(
            slug="polimi", name="Politecnico di Milano", kind="university",
            city="Milano", region="Lombardia", country="IT",
            website="https://www.polimi.it", no_tax_isee=22000,
            fee_min=157, fee_max=3943,
        )
        s.add(inst)
        s.commit()
    return inst


def enrich_subjects(pause_seconds=7.0):
    """LLM step: extract subject themes from each programme's overview page.

    Rows are stored with track='llm' so table-parsed curricula are never mixed
    with model-extracted ones. Paced for the Gemini free tier (~10 req/min).
    """
    import time

    from ..db import ProgramSubject
    from ..llm_extract import extract_subjects

    stats = {"programs": 0, "subjects": 0, "skipped": 0, "errors": []}
    with Session() as s:
        inst = ensure_institution(s)
        progs = s.query(Program).filter_by(institution_id=inst.id).order_by(Program.name).all()
        for prog in progs:
            existing = [x for x in prog.subjects if x.track == "llm"]
            if existing:
                stats["skipped"] += 1
                continue
            try:
                text = BeautifulSoup(fetch(prog.url).text, "lxml").get_text(" ", strip=True)
                subjects = extract_subjects(text)
                if subjects is None:
                    stats["errors"].append("GEMINI_API_KEY not set — step skipped")
                    break
                for sub in subjects:
                    name = (sub.get("name") or "").strip()
                    if not name:
                        continue
                    s.add(ProgramSubject(
                        program_id=prog.id, track="llm", year=sub.get("year"),
                        name=name[:300], ects=sub.get("ects"),
                    ))
                s.commit()
                stats["programs"] += 1
                stats["subjects"] += len(subjects)
                print(f"  ✓ {prog.name} — {len(subjects)} subjects (LLM)")
                time.sleep(pause_seconds)
            except Exception as exc:
                s.rollback()
                stats["errors"].append(f"{prog.name}: {exc}")
                print(f"  ✗ {prog.name}: {exc}")
    return stats


def ingest():
    stats = {"programs": 0, "errors": []}
    with Session() as s:
        inst = ensure_institution(s)
        html = fetch(CATALOG).text
        soup = BeautifulSoup(html, "lxml")
        seen = {}
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if not DETAIL_RE.search(href):
                continue
            url = href if href.startswith("http") else "https://www.polimi.it" + href
            title = a.select_one(".localised-title-title") or a.select_one("p.strong")
            name = title.get_text(" ", strip=True) if title else a.get_text(" ", strip=True)
            campuses = ", ".join(c.get_text(strip=True) for c in a.select(".campusName")) or None
            lang_el = a.select_one(".info-label--internet span")
            language = lang_el.get_text(strip=True).replace("-", ", ") if lang_el else None
            if name:
                seen[url] = (name, campuses, language)
        for url, (name, campuses, language) in sorted(seen.items()):
            try:
                prog = s.query(Program).filter_by(institution_id=inst.id, url=url).one_or_none()
                if not prog:
                    prog = Program(institution_id=inst.id, url=url)
                    s.add(prog)
                prog.name = name
                prog.campus = campuses
                prog.language = language
                prog.source = CATALOG
                prog.fetched_at = datetime.utcnow()
                s.commit()
                stats["programs"] += 1
            except Exception as exc:
                s.rollback()
                stats["errors"].append(f"{url}: {exc}")
    return stats
