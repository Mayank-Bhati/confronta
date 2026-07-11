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


MANIFESTO_BASE = "https://onlineservices.polimi.it"


def _clean_name(name):
    # cell text may append access notes ("... Insegnamento a numero chiuso")
    name = re.split(r"\s+Insegnamento\b", name)[0].strip()
    return name.title()


def parse_manifesto(html):
    """Yield (year, name, ects, semester) from a ManifestoPublic page.

    The full 3-year plan is one page; rows are 11-cell subject rows and the
    current year comes from inline "N o Anno" marker rows.
    """
    soup = BeautifulSoup(html, "lxml")
    year = None
    for tr in soup.find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        marker = next((c for c in cells[:2] if re.match(r"^\s*[123]\s*o\s*Anno", c or "")), None)
        if marker:
            year = int(marker.strip()[0])
            continue
        if year and len(cells) >= 10 and re.fullmatch(r"\d{6}", cells[0] or ""):
            name = _clean_name(cells[4])
            if not name:
                continue
            m = re.match(r"(\d+(?:\.\d+)?)", cells[9] or "")
            ects = int(float(m.group(1))) if m else None
            yield year, name, ects, (cells[8] or "")[:8]


def ingest_manifesto():
    """Year-by-year study plans for every PoliMi programme, from the public
    Manifesto degli Studi (onlineservices.polimi.it — no login needed)."""
    stats = {"programs": 0, "subjects": 0, "errors": []}
    with Session() as s:
        inst = ensure_institution(s)
        progs = s.query(Program).filter_by(institution_id=inst.id).order_by(Program.name).all()
        for prog in progs:
            try:
                if any(x.track == "manifesto" for x in prog.subjects):
                    continue  # already extracted
                detail = fetch(prog.url).text
                m = re.search(r"k_corso_la=(\d+)", detail)
                if not m:
                    # EN pages sometimes omit the Manifesto link — follow the IT detail page
                    it_link = re.search(r'href="(/formazione/corsi-di-laurea/dettaglio-corso/[a-z0-9-]+)"', detail)
                    if it_link:
                        detail_it = fetch("https://www.polimi.it" + it_link.group(1)).text
                        m = re.search(r"k_corso_la=(\d+)", detail_it)
                if not m:
                    stats["errors"].append(f"{prog.name}: no k_corso_la on detail page")
                    continue
                corso = m.group(1)
                indirizzi = fetch(f"https://aunicalogin.polimi.it/aunicalogin/getservizio.xml?id_servizio=401&k_corso_la={corso}").text
                link = re.search(r'href="(/manifesti/manifesti/controller/ManifestoPublic\.do[^"]*aa=\d+[^"]*)"', indirizzi)
                if not link:
                    stats["errors"].append(f"{prog.name}: no ManifestoPublic link")
                    continue
                url = MANIFESTO_BASE + link.group(1).replace("&amp;", "&")
                rows = list(parse_manifesto(fetch(url).text))
                if not rows:
                    stats["errors"].append(f"{prog.name}: manifesto parsed 0 rows")
                    continue
                from ..db import ProgramSubject
                s.query(ProgramSubject).filter_by(program_id=prog.id, track="manifesto").delete()
                seen = set()
                n = 0
                for year, name, ects, sem in rows:
                    key = (year, name.lower())
                    if key in seen:
                        continue
                    seen.add(key)
                    s.add(ProgramSubject(program_id=prog.id, track="manifesto", year=year,
                                         semester=sem, name=name[:300], ects=ects))
                    n += 1
                prog.curriculum_url = url
                s.commit()
                stats["programs"] += 1
                stats["subjects"] += n
                print(f"  ✓ {prog.name} — {n} subjects across years")
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
