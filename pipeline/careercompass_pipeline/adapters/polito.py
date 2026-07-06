"""Politecnico di Torino adapter.

Catalog page lists absolute URLs of every bachelor programme; each programme
has a /programme-curriculum page with per-track tables (Code | Course |
Language | Semester | Credits), one table per year in order.
"""
import re
from datetime import datetime

from bs4 import BeautifulSoup

from ..db import Institution, Program, ProgramSubject, Session
from ..http import fetch

CATALOG = "https://www.polito.it/en/education/bachelor-s-degree-programmes"
LINK_RE = re.compile(r"https://www\.polito\.it/en/education/bachelor-s-degree-programmes/([a-z0-9-]+)$")


def ensure_institution(s):
    inst = s.query(Institution).filter_by(slug="polito").one_or_none()
    if not inst:
        inst = Institution(
            slug="polito", name="Politecnico di Torino", kind="university",
            city="Torino", region="Piemonte", country="IT",
            website="https://www.polito.it", no_tax_isee=22000, fee_min=600,
        )
        s.add(inst)
        s.commit()
    return inst


def catalog_urls():
    html = fetch(CATALOG).text
    urls = set()
    for a in BeautifulSoup(html, "lxml").find_all("a", href=True):
        m = LINK_RE.match(a["href"].strip())
        if m and m.group(1) != "bachelor-s-degree-programmes":
            urls.add(a["href"].strip())
    return sorted(urls)


def parse_program_page(url):
    html = fetch(url).text
    soup = BeautifulSoup(html, "lxml")
    title = soup.find("h1")
    if title:
        name = re.sub(r"(?i)^bachelor'?s degree programme\s*", "", title.get_text(" ", strip=True)).strip()
        name = name or url.rsplit("/", 1)[-1].replace("-", " ").title()
        name = name.title() if name.isupper() or name.islower() else name
    else:
        name = url.rsplit("/", 1)[-1].replace("-", " ").title()
    text = soup.get_text(" ", strip=True)
    m = re.search(r"\b(L-\d+|LM-\d+|L/SNT\d+)\b", text)
    degree_class = m.group(1) if m else None
    language = None
    m = re.search(r"Language\s*[:\-]?\s*(Italian(?:,\s*English)?|English(?:,\s*Italian)?)", text, re.I)
    if m:
        language = m.group(1)
    return name, degree_class, language


def parse_curriculum(url):
    """Yield (track, year, code, subject, semester, ects) rows."""
    html = fetch(url).text
    soup = BeautifulSoup(html, "lxml")
    track = "main"
    year_in_track = 0
    for tag in soup.find_all(["h3", "table"]):
        if tag.name == "h3":
            heading = tag.get_text(strip=True)
            if heading:
                track = heading
                year_in_track = 0
            continue
        header = [th.get_text(strip=True).lower() for th in tag.find_all("th")]
        if "course" not in " ".join(header):
            continue
        year_in_track += 1
        for tr in tag.find_all("tr"):
            tds = [td.get_text(strip=True) for td in tr.find_all("td")]
            if len(tds) < 5 or not tds[1]:
                continue
            code, course, _lang, semester, credits = tds[:5]
            ects = None
            m = re.match(r"\d{1,2}", credits or "")
            if m:
                ects = int(m.group(0))
            yield track, year_in_track, code[:40], course[:300], semester[:8], ects


def ingest(limit=None):
    stats = {"programs": 0, "subjects": 0, "errors": []}
    with Session() as s:
        inst = ensure_institution(s)
        urls = catalog_urls()
        if limit:
            urls = urls[:limit]
        for url in urls:
            try:
                # Fetch everything BEFORE opening the write transaction —
                # fetch() logs to the DB and SQLite allows one writer at a time.
                name, degree_class, language = parse_program_page(url)
                curriculum_url = url + "/programme-curriculum"
                subj_rows = []
                try:
                    subj_rows = list(parse_curriculum(curriculum_url))
                except Exception as exc:  # curriculum page missing for a few programmes
                    stats["errors"].append(f"curriculum {url}: {exc}")

                prog = s.query(Program).filter_by(institution_id=inst.id, url=url).one_or_none()
                if not prog:
                    prog = Program(institution_id=inst.id, url=url)
                    s.add(prog)
                prog.name = name
                prog.degree_class = degree_class
                prog.language = language
                prog.curriculum_url = curriculum_url
                prog.campus = "Torino"
                prog.source = CATALOG
                prog.fetched_at = datetime.utcnow()
                s.flush()
                s.query(ProgramSubject).filter_by(program_id=prog.id).delete()
                for track, year, code, subject, semester, ects in subj_rows:
                    s.add(ProgramSubject(
                        program_id=prog.id, track=track[:120], year=year,
                        semester=semester, code=code, name=subject, ects=ects,
                    ))
                s.commit()
                stats["programs"] += 1
                stats["subjects"] += len(subj_rows)
                print(f"  ✓ {name} — {len(subj_rows)} subject rows")
            except Exception as exc:
                s.rollback()
                stats["errors"].append(f"program {url}: {exc}")
                print(f"  ✗ {url}: {exc}")
    return stats
