"""Universitaly adapter — the official MUR registry of every accredited
Italian degree course, via the Cineca backend API discovered by network
capture (2026-07-11):

    GET https://universitaly-backend.cineca.it/api/offerta-formativa/cerca-corsi
        ?searchText=&tipoLaurea=&tipoAccesso=&provincia=&order=RND ...

Response: {"universita": {"totalResults", "totalPages", "currentPage",
"corsi": [{id, nomeStruttura, nomeCorso, nomeCorsoEn, tipoLaurea.descrizione,
sede.comuneDescrizione, durataAnni, lingua, url, classe.codice}, ...]}}

The site's own network blocks non-browser traffic on www.universitaly.it, but
the backend API answers plain requests from GitHub Actions runners — this
adapter is designed to run there (workflow: data-pipeline.yml).

Rows land in the raw `uni_catalog` table: the nationwide dataset that future
curation draws from (it is NOT the curated `programs` table).
"""
import time

import requests
from sqlalchemy import Column, Integer, String

from ..db import Base, Session, engine

API = "https://universitaly-backend.cineca.it/api/offerta-formativa/cerca-corsi"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36"


class UniCatalogCourse(Base):
    __tablename__ = "uni_catalog"
    id = Column(Integer, primary_key=True)
    cineca_id = Column(String(32), unique=True, nullable=False)
    institution = Column(String(300))
    name = Column(String(400))
    name_en = Column(String(400))
    degree_type = Column(String(60))      # Triennale / Magistrale / Ciclo unico...
    degree_class = Column(String(24))     # e.g. L-8 R
    city = Column(String(160))
    years = Column(String(8))
    language = Column(String(24))
    url = Column(String(600))


class AfamCatalogCourse(Base):
    """Conservatori, accademie di belle arti, ISIA and the dance/drama academies.

    The same Cineca endpoint answers with three branches — universita, afam and
    equipollenti — and this adapter only ever read the first, so 2,080 official
    music and art courses sat one dictionary key away the whole time. AFAM is a
    separate legal sector from universities and from ITS: its qualifications are
    "diploma accademico" (class codes like DCPL08), not lauree.
    """
    __tablename__ = "afam_catalog"
    id = Column(Integer, primary_key=True)
    cineca_id = Column(String(32), unique=True, nullable=False)
    institution = Column(String(300))
    name = Column(String(400))
    name_en = Column(String(400))
    degree_type = Column(String(60))      # Triennale / Magistrale
    degree_class = Column(String(24))     # DCPL08, DCSL09 ...
    city = Column(String(160))
    years = Column(String(8))
    language = Column(String(24))
    url = Column(String(600))


def _get_raw(params, session):
    resp = session.get(API, params=params, timeout=40, headers={"User-Agent": UA})
    resp.raise_for_status()
    return resp.json()


def _get(params, session):
    return _get_raw(params, session)["universita"]


def ingest(max_pages=None, delay=0.7):
    """Page through the whole catalog and upsert into uni_catalog."""
    Base.metadata.create_all(engine)  # creates uni_catalog if missing
    http = requests.Session()
    stats = {"pages": 0, "upserts": 0, "total_results": None, "errors": []}
    base_params = {
        "searchText": "", "area": "", "tipoLaurea": "", "tipoClasse": "0",
        "durata": "", "lingua": "", "tipoAccesso": "", "modalitaErogazione": "",
        "order": "AZ", "provincia": "", "provinciaSigla": "",
    }
    first = _get({**base_params, "page": "1"}, http)
    total_pages = int(first.get("totalPages") or 1)
    stats["total_results"] = first.get("totalResults")
    if max_pages:
        total_pages = min(total_pages, max_pages)

    with Session() as s:
        existing = {r.cineca_id for r in s.query(UniCatalogCourse.cineca_id).all()}
        page = 1
        data = first
        while True:
            for c in data.get("corsi", []):
                cid = str(c.get("id"))
                if not cid:
                    continue
                row = s.query(UniCatalogCourse).filter_by(cineca_id=cid).one_or_none() if cid in existing else None
                if not row:
                    row = UniCatalogCourse(cineca_id=cid)
                    s.add(row)
                    existing.add(cid)
                row.institution = (c.get("nomeStruttura") or "")[:300]
                row.name = (c.get("nomeCorso") or "")[:400]
                row.name_en = (c.get("nomeCorsoEn") or "")[:400]
                row.degree_type = ((c.get("tipoLaurea") or {}).get("descrizione") or "")[:60]
                row.degree_class = ((c.get("classe") or {}).get("codice") or "")[:24]
                row.city = ((c.get("sede") or {}).get("comuneDescrizione") or "")[:160]
                row.years = str(c.get("durataAnni") or "")[:8]
                row.language = (c.get("lingua") or "")[:24]
                row.url = (c.get("url") or "")[:600]
                stats["upserts"] += 1
            s.commit()
            stats["pages"] = page
            if page % 25 == 0 or page == total_pages:
                print(f"  page {page}/{total_pages} — {stats['upserts']} rows")
            if page >= total_pages:
                break
            page += 1
            time.sleep(delay)
            try:
                data = _get({**base_params, "page": str(page)}, http)
                # guard against a backend that ignores the page param
                if str(data.get("currentPage")) != str(page):
                    stats["errors"].append(f"pagination param ignored at page {page} (got {data.get('currentPage')})")
                    break
            except Exception as exc:
                stats["errors"].append(f"page {page}: {exc}")
                break
    return stats


def ingest_afam(max_pages=None, delay=0.4):
    """Walk the afam branch of the same catalogue endpoint.

    Both branches paginate off one `page` parameter but have different lengths,
    so the AFAM side simply runs out first; we stop at its own totalPages
    instead of walking the university count and writing nothing for 380 pages.
    """
    http = requests.Session()
    stats = {"pages": 0, "upserts": 0, "total_results": None, "errors": []}
    base = {"searchText": "", "area": "", "tipoLaurea": "", "tipoClasse": "0",
            "durata": "", "lingua": "", "tipoAccesso": "", "modalitaErogazione": "",
            "order": "AZ", "provincia": "", "provinciaSigla": ""}
    first = _get_raw({**base, "page": "1"}, http)["afam"]
    total_pages = int(first.get("totalPages") or 1)
    stats["total_results"] = first.get("totalResults")
    if max_pages:
        total_pages = min(total_pages, max_pages)

    with Session() as s:
        existing = {r.cineca_id for r in s.query(AfamCatalogCourse.cineca_id).all()}
        page, data = 1, first
        while True:
            for c in data.get("corsi", []):
                # the afam branch keys its id as idCorso, not id
                cid = str(c.get("idCorso") or c.get("id") or "")
                if not cid:
                    continue
                row = (s.query(AfamCatalogCourse).filter_by(cineca_id=cid).one_or_none()
                       if cid in existing else None)
                if not row:
                    row = AfamCatalogCourse(cineca_id=cid)
                    s.add(row)
                    existing.add(cid)
                row.institution = (c.get("nomeStruttura") or "")[:300]
                row.name = (c.get("nomeCorso") or "")[:400]
                row.name_en = (c.get("nomeCorsoEn") or "")[:400]
                row.degree_type = ((c.get("tipoLaurea") or {}).get("descrizione") or "")[:60]
                row.degree_class = ((c.get("classe") or {}).get("codice") or "")[:24]
                row.city = ((c.get("sede") or {}).get("comuneDescrizione") or "")[:160]
                row.years = str(c.get("durataAnni") or "")[:8]
                row.language = (c.get("lingua") or "")[:24]
                row.url = (c.get("url") or "")[:600]
                stats["upserts"] += 1
            s.commit()
            stats["pages"] = page
            if page % 25 == 0 or page == total_pages:
                print(f"  afam page {page}/{total_pages} — {stats['upserts']} rows")
            if page >= total_pages:
                break
            page += 1
            time.sleep(delay)
            try:
                data = _get_raw({**base, "page": str(page)}, http)["afam"]
            except Exception as exc:
                stats["errors"].append(f"page {page}: {exc}")
                break
    return stats
