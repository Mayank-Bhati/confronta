"""Real ITS Academy outcomes from INDIRE's national monitoring.

AlmaLaurea surveys university graduates, so every ITS course on the site showed
"no survey data". INDIRE — which monitors the ITS system on the Ministry's
behalf — publishes a per-course ranking of all 506 courses that ended in 2024
and were followed up a year later, with the number of diplomates, the
"occupati equivalenti" value and a composite effectiveness index.

The PDF carries a real text layer, so this reads exact values. An earlier
attempt through a generic HTML/OCR parse mangled institution names ("Rizzoli"
came out as Rizzi, Riczol and Rizzo across three rows) and was rightly thrown
away: a number extracted from corrupted text is indistinguishable from an
invented one.

Two INDIRE terms, used with their own meanings and not renamed:

  · "occupati equivalenti" — a weighted count of those in work at 12 months,
    not a headcount. Dividing by diplomati gives a rate that is close to, but
    not the same as, a plain employment percentage, so the UI labels it as
    INDIRE's measure rather than as "employed".
  · "indice di efficacia del percorso" — a composite: the cube root of the
    product of three component scores (diplomates, equivalent employed, and the
    12-month follow-up). Reported verbatim, never recomputed.

    python3 main.py ingest indire
"""
import json
import os
import re

import requests

SOURCE = ("https://www.indire.it/wp-content/uploads/2026/06/"
          "1.Indire_Monitoraggio_2026_ITS_Ranking_generale_Aree_Tecnologiche_Regioni.pdf")
LANDING = "https://www.indire.it/progetto/its-istituti-tecnologici-superiori/monitoraggio-nazionale/"

# our institution slug → the academy's official name in the ranking
INSTITUTIONS = {
    "its-rizzoli": r"Angelo\s+Rizzoli",
    "its-lomb-mecc": r"Lombardo per le Nuove tecnologie Meccaniche",
    "its-energia-pi": r"sviluppo\s+professionalit",
}

# site course id → a fragment of the official title, unique within that academy.
# Only courses whose INDIRE row can be identified beyond doubt are listed; the
# rest fall back to their academy's total rather than being guessed at.
COURSE_MATCH = {
    "its-rizzoli-p86": "CYBER DEFENSE SPECIALIST ' (SEZ A)",
    "its-rizzoli-p80": "SOFTWARE ARCHITECT SPECIALIST SEZ A",
    "its-rizzoli-p87": "BIG DATA SPECIALIST",
    "its-rizzoli-p91": "DIGITAL MARKETING DATA SPECIALIST",
    "its-rizzoli-p92": "OMNICHANNEL COMMUNICATION SPECIALIST",
    "its-rizzoli-p85": "CLOUD AND DATA SECURITY SPECIALIST",
    "its-lomb-mecc-p77": "MECCATRONICI BIOMEDICALI",
}

ROW = re.compile(
    r"(\d{2}/\d{2}/\d{4}) (\d{2}/\d{2}/\d{4}) ([\d.]+) ([\d.]+) (\d+) ([\d.]+) (\d+)° su (\d+)")


def _rows(pdf_bytes):
    import pypdf
    import io as _io
    reader = pypdf.PdfReader(_io.BytesIO(pdf_bytes))
    text = re.sub(r"\s+", " ", "\n".join((p.extract_text() or "") for p in reader.pages))
    out, last = [], 0
    for m in ROW.finditer(text):
        out.append({
            "head": text[last:m.start()][-300:].strip(),
            "efficacia": float(m.group(4)),
            "diplomati": int(m.group(5)),
            "occupati_equivalenti": float(m.group(6)),
            "rank": int(m.group(7)),
            "of": int(m.group(8)),
        })
        last = m.end()
    return out


def ingest():
    resp = requests.get(SOURCE, timeout=120)
    resp.raise_for_status()
    rows = _rows(resp.content)
    if len(rows) < 400:
        raise RuntimeError(f"only {len(rows)} rows parsed — the report layout has changed")

    out = {"source": SOURCE, "landing": LANDING, "totalCourses": len(rows),
           "note": ("INDIRE national ITS monitoring 2026, courses that ended in 2024 and were "
                    "followed up after 12 months. 'occupati equivalenti' is INDIRE's weighted "
                    "measure of those in work, not a headcount."),
           "institutions": {}, "courses": {}}

    for slug, pattern in INSTITUTIONS.items():
        mine = [r for r in rows if re.search(pattern, r["head"], re.I)]
        if not mine:
            continue
        d = sum(r["diplomati"] for r in mine)
        o = sum(r["occupati_equivalenti"] for r in mine)
        out["institutions"][slug] = {
            "courses": len(mine), "diplomati": d, "occupatiEquivalenti": round(o, 1),
            "rate": round(o / d * 100, 1) if d else None,
            "bestRank": min(r["rank"] for r in mine), "of": mine[0]["of"],
        }

    for cid, fragment in COURSE_MATCH.items():
        slug = cid.rsplit("-p", 1)[0]
        cand = [r for r in rows
                if re.search(INSTITUTIONS[slug], r["head"], re.I)
                and fragment.lower() in r["head"].lower()]
        # ambiguity means we do not know which row this is, so we say nothing
        if len(cand) != 1:
            continue
        r = cand[0]
        out["courses"][cid] = {
            "rate": round(r["occupati_equivalenti"] / r["diplomati"] * 100, 1),
            "diplomati": r["diplomati"], "occupatiEquivalenti": r["occupati_equivalenti"],
            "efficacia": r["efficacia"], "rank": r["rank"], "of": r["of"],
        }

    # this file sits one level deeper than the other pipeline modules
    # (…/careercompass_pipeline/adapters/), so the repo root is four up
    root = os.path.abspath(__file__)
    for _ in range(4):
        root = os.path.dirname(root)
    data_dir = os.path.join(root, "data")
    path = os.path.join(data_dir, "indire-its.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    return {"rows": len(rows), "institutions": len(out["institutions"]),
            "courses": len(out["courses"]), "file": path}


if __name__ == "__main__":
    print(ingest())
