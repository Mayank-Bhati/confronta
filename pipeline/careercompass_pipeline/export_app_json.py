"""Export the database to app-shaped JSON for review.

Writes to pipeline/out/ — the website's data/ files are only replaced after
the exported files have been reviewed and approved.
"""
import json
import os

from .db import Institution, Program, ProgramSubject, Session

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "out")


def export():
    os.makedirs(OUT_DIR, exist_ok=True)
    with Session() as s:
        payload = []
        for inst in s.query(Institution).order_by(Institution.slug):
            for p in inst.programs:
                # One curriculum per program: take the first track only
                # (programmes often repeat the plan for English/other-campus tracks).
                tracks = []
                for sub in p.subjects:
                    if sub.track not in tracks:
                        tracks.append(sub.track)
                first_track = tracks[0] if tracks else None
                main_subjects = [
                    {"year": sub.year, "name": sub.name, "ects": sub.ects}
                    for sub in sorted(p.subjects, key=lambda x: (x.year or 9, x.name))
                    if sub.track == first_track
                ]
                payload.append({
                    "id": f"{inst.slug}-{p.id}",
                    "name": p.name,
                    "inst": inst.name,
                    "type": "University" if inst.kind == "university" else "ITS",
                    "city": p.campus or inst.city,
                    "years": p.years,
                    "degreeClass": p.degree_class,
                    "language": " ".join(p.language.split()) if p.language else None,
                    "url": p.url,
                    "curriculumUrl": p.curriculum_url,
                    "curriculum": [x["name"] for x in main_subjects][:12],
                    "subjectsDetailed": main_subjects,
                    "source": p.source,
                    "fetchedAt": p.fetched_at.isoformat() if p.fetched_at else None,
                })
    out_path = os.path.join(OUT_DIR, "programs-preview.json")
    with open(out_path, "w") as f:
        json.dump(payload, f, indent=1, ensure_ascii=False)
    return out_path, len(payload)
