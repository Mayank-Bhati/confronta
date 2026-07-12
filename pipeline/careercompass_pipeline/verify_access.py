"""Verify admission access types for candidate courses via the Universitaly
(Cineca) API — runs on GitHub Actions (the API is WAF-blocked from home).

Pass 2 (pass 1 findings): tipoAccesso accepts 1/2/3 which partition the
catalog (3546/1159/1103) but bucket 1 contained nationally-programmed courses,
so the semantics are unclear. This pass:
  1. characterizes each bucket: first page of results + where "Medicina e
     chirurgia" (programmato nazionale by law) lands;
  2. classifies each candidate with FULL pagination (pass 1 capped at 5 pages
     and missed two candidates);
  3. drives the real site with Playwright, clicks into a course detail page,
     and captures the detail API call — which should carry access type + city.

Usage: python -m careercompass_pipeline.verify_access
"""
import json
import time

import requests

API = "https://universitaly-backend.cineca.it/api/offerta-formativa/cerca-corsi"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36"

CANDIDATES = [
    ("physio/unito", "Fisioterapia", "di TORINO"),
    ("physio/unimib", "Fisioterapia", "MILANO-BICOCCA"),
    ("physio/unimi", "Fisioterapia", "di MILANO "),
    ("psych/unito", "Scienze e Tecniche psicologiche", "di TORINO"),
    ("psych/unimib", "Scienze e tecniche psicologiche", "MILANO-BICOCCA"),
    ("psych/unimi", "Scienze psicologiche per la prevenzione e la cura", "di MILANO"),
    ("teacher/unito", "Scienze della formazione primaria", "di TORINO"),
    ("teacher/unimib", "Scienze della formazione primaria", "MILANO-BICOCCA"),
    ("educ/unito", "Scienze dell'educazione", "di TORINO"),
    ("educ/unimib", "Scienze dell'educazione", "MILANO-BICOCCA"),
    ("tourism/unito", "Lingue e culture per il turismo", "di TORINO"),
    ("tourism/unimib", "Scienze del turismo", "MILANO-BICOCCA"),
    ("social/unito", "Servizio sociale", "di TORINO"),
    ("social/unimib", "Servizio sociale", "MILANO-BICOCCA"),
    # control: known accesso programmato nazionale
    ("CONTROL medicina", "Medicina e chirurgia", "di MILANO-BICOCCA"),
]

BASE_PARAMS = {
    "searchText": "", "area": "", "tipoLaurea": "", "tipoClasse": "0",
    "durata": "", "lingua": "", "tipoAccesso": "", "modalitaErogazione": "",
    "order": "AZ", "provincia": "", "provinciaSigla": "", "page": "1",
}


def get(params):
    r = requests.get(API, params=params, timeout=40, headers={"User-Agent": UA})
    r.raise_for_status()
    return r.json()["universita"]


def all_hits(text, access, inst_match):
    """Full pagination for searchText+tipoAccesso; return matching courses."""
    hits, page, total = [], 1, 1
    while page <= total:
        data = get({**BASE_PARAMS, "searchText": text, "tipoAccesso": access, "page": str(page)})
        total = int(data.get("totalPages") or 1)
        for c in data.get("corsi", []):
            if (inst_match.upper() in (c.get("nomeStruttura") or "").upper()
                    and text.lower() in (c.get("nomeCorso") or "").lower()):
                hits.append(c)
        page += 1
        time.sleep(0.25)
    return hits


def api_pass():
    print("=== 1. bucket characterization (first page each) ===")
    for v in ("1", "2", "3"):
        data = get({**BASE_PARAMS, "tipoAccesso": v})
        print(f"-- tipoAccesso={v}: {data.get('totalResults')} results")
        for c in data.get("corsi", [])[:8]:
            print(f"     [{(c.get('classe') or {}).get('codice','?'):10}] {c.get('nomeCorso','')[:58]} | {c.get('nomeStruttura','')[:40]}")

    print("\n=== 2. candidate classification, full pagination ===")
    for label, text, inst_match in CANDIDATES:
        row = {}
        for v in ("1", "2", "3"):
            try:
                hits = all_hits(text, v, inst_match)
                if hits:
                    row[v] = [f"{h['id']}:{h['nomeCorso'][:44]}" for h in hits]
            except Exception as e:
                row[v] = f"ERROR {e}"
        print(f"  {label:18} -> {json.dumps(row, ensure_ascii=False)}")


def detail_capture():
    print("\n=== 3. detail page network capture ===")
    from playwright.sync_api import sync_playwright

    calls = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        def on_response(resp):
            if "cineca.it" in resp.url and "cerca-corsi?" not in resp.url:
                entry = {"url": resp.url, "status": resp.status}
                try:
                    entry["body_head"] = resp.text()[:1500]
                except Exception:
                    pass
                calls.append(entry)

        page.on("response", on_response)
        try:
            page.goto("https://www.universitaly.it/cerca-corsi", wait_until="domcontentloaded", timeout=45000)
            page.wait_for_timeout(8000)
            box = page.locator("input").first
            box.fill("fisioterapia")
            page.keyboard.press("Enter")
            page.wait_for_timeout(8000)
            # click the first course card / detail link that appears
            link = page.locator("a[href*='corso'], a[href*='dettaglio']").first
            print("  clicking:", link.get_attribute("href"))
            link.click()
            page.wait_for_timeout(9000)
            print("  landed on:", page.url)
        except Exception as e:
            print("  browse failed:", e)
        browser.close()
    for c in calls:
        print(f"  {c['status']} {c['url'][:150]}")
        if c.get("body_head"):
            print("      " + c["body_head"][:700].replace("\n", " "))


def main():
    api_pass()
    try:
        detail_capture()
    except Exception as e:
        print("detail capture skipped:", e)


if __name__ == "__main__":
    main()
