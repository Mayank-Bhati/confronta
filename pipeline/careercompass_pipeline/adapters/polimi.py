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


def ingest():
    stats = {"programs": 0, "errors": []}
    with Session() as s:
        inst = ensure_institution(s)
        html = fetch(CATALOG).text
        soup = BeautifulSoup(html, "lxml")
        seen = {}
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            if DETAIL_RE.search(href):
                url = href if href.startswith("http") else "https://www.polimi.it" + href
                name = a.get_text(strip=True)
                if name:
                    seen[url] = name
        for url, name in sorted(seen.items()):
            try:
                prog = s.query(Program).filter_by(institution_id=inst.id, url=url).one_or_none()
                if not prog:
                    prog = Program(institution_id=inst.id, url=url)
                    s.add(prog)
                prog.name = name
                prog.source = CATALOG
                prog.fetched_at = datetime.utcnow()
                s.commit()
                stats["programs"] += 1
            except Exception as exc:
                s.rollback()
                stats["errors"].append(f"{url}: {exc}")
    return stats
