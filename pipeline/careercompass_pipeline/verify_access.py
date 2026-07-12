"""Verify admission access types for candidate courses via the Universitaly
(Cineca) API — runs on GitHub Actions (the API is WAF-blocked from home).

Three jobs in one pass:
  1. discover what values the `tipoAccesso` filter accepts;
  2. probe for a course-detail endpoint (would also give us the missing city);
  3. classify each five-careers candidate course by access type, by checking
     which tipoAccesso bucket returns its cineca id.

Usage: python -m careercompass_pipeline.verify_access
"""
import json

import requests

API = "https://universitaly-backend.cineca.it/api/offerta-formativa/cerca-corsi"
BASE = "https://universitaly-backend.cineca.it"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36"

# (label, searchText, institution match) — the five-careers candidates
CANDIDATES = [
    ("physio/unito", "Fisioterapia", "TORINO"),
    ("physio/unimib", "Fisioterapia", "MILANO-BICOCCA"),
    ("physio/unimi", "Fisioterapia", "di MILANO"),
    ("psych/unito", "Scienze e Tecniche psicologiche", "TORINO"),
    ("psych/unimib", "Scienze e tecniche psicologiche", "MILANO-BICOCCA"),
    ("psych/unimi", "Scienze psicologiche per la prevenzione e la cura", "di MILANO"),
    ("teacher/unito", "Scienze della formazione primaria", "TORINO"),
    ("teacher/unimib", "Scienze della formazione primaria", "MILANO-BICOCCA"),
    ("educ/unito", "Scienze dell'educazione", "TORINO"),
    ("educ/unimib", "Scienze dell'educazione", "MILANO-BICOCCA"),
    ("tourism/unito", "Lingue e culture per il turismo", "TORINO"),
    ("tourism/unimib", "Scienze del turismo", "MILANO-BICOCCA"),
    ("social/unito", "Servizio sociale", "TORINO"),
    ("social/unimib", "Servizio sociale", "MILANO-BICOCCA"),
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


def main():
    http = requests.Session()

    print("=== 1. tipoAccesso value discovery (totalResults per value) ===")
    valid = {}
    for v in ["", "1", "2", "3", "4", "L", "P", "PN", "libero", "programmato"]:
        try:
            data = get({**BASE_PARAMS, "tipoAccesso": v})
            n = data.get("totalResults")
            print(f"  tipoAccesso={v!r:14} -> {n}")
            if v and n and int(n) not in (0, 5808):
                valid[v] = int(n)
        except Exception as e:
            print(f"  tipoAccesso={v!r:14} -> ERROR {e}")
    print(f"  discriminating values: {valid}")

    print("\n=== 2. detail endpoint probe (also hunting the city field) ===")
    sample = get({**BASE_PARAMS, "searchText": "Fisioterapia"})
    cid = sample["corsi"][0]["id"]
    for path in [
        f"/api/offerta-formativa/corso/{cid}",
        f"/api/offerta-formativa/dettaglio-corso/{cid}",
        f"/api/offerta-formativa/corsi/{cid}",
        f"/api/corso/{cid}",
        f"/api/offerta-formativa/cerca-corsi/{cid}",
        f"/api/offerta-formativa/corso?id={cid}",
    ]:
        try:
            r = requests.get(BASE + path, timeout=25, headers={"User-Agent": UA})
            head = r.text[:220].replace("\n", " ")
            print(f"  {r.status_code} {path}\n      {head}")
        except Exception as e:
            print(f"  ERR {path}: {e}")

    print("\n=== 3. candidate classification ===")
    results = {}
    for label, text, inst_match in CANDIDATES:
        buckets = []
        for v in valid or ["1", "2", "3"]:
            try:
                data = get({**BASE_PARAMS, "searchText": text, "tipoAccesso": v})
                pages = min(int(data.get("totalPages") or 1), 5)
                corsi = list(data.get("corsi", []))
                for p in range(2, pages + 1):
                    corsi += get({**BASE_PARAMS, "searchText": text,
                                  "tipoAccesso": v, "page": str(p)}).get("corsi", [])
                hits = [c for c in corsi
                        if inst_match.upper() in (c.get("nomeStruttura") or "").upper()
                        and text.lower() in (c.get("nomeCorso") or "").lower()]
                if hits:
                    buckets.append((v, [f"{c['id']}:{c['nomeCorso'][:40]}" for c in hits]))
            except Exception as e:
                print(f"  {label}: tipoAccesso={v} ERROR {e}")
        results[label] = buckets
        print(f"  {label:16} -> {buckets}")

    print("\nJSON:", json.dumps(results))


if __name__ == "__main__":
    main()
