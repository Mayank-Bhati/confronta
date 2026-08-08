"""Stamp REAL AlmaLaurea outcomes onto the site's course data.

Runs standalone (no database): the catalogue comes from Universitaly via the
DB exporter, while graduate outcomes come from AlmaLaurea — different sources,
so they are merged as a separate, auditable step.

What it does per course:
  · finds the AlmaLaurea row for (institution × disciplinary group × level)
  · writes employment1y, unemployment, wouldChooseAgain, teachSat and dropout
    from that row, together with the survey year and the exact source URL
  · when there is no row — Politecnico di Milano, Bocconi and every ITS academy
    are not in the AlmaLaurea consortium — it sets those fields to null and
    records why, so the site can say "no survey data" instead of inventing one.

Nothing here estimates anything. If AlmaLaurea does not publish it, the site
does not show it.

    python3 -m careercompass_pipeline.apply_outcomes
"""
import json
import os

STRIP_ESTIMATES = os.environ.get("STRIP_ESTIMATES") == "1"

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, "data")

# career id → AlmaLaurea disciplinary group. Courses inherit the group of the
# career they sit under; a few are overridden by course name below.
CAREER_GROUP = {
    "software-dev": "ict", "cyber": "ict", "cloud-tech": "ict", "data-analyst": "ict",
    "robotics-eng": "ing_ind", "auto-tech": "ing_ind", "maint-eng": "ing_ind",
    "mechatronics": "ing_ind", "biomed-tech": "ing_ind", "renewables": "ing_ind",
    "food-tech": "ing_ind",
    "env-eng": "ing_civ",
    "marketing": "economico", "export": "economico", "fin-analyst": "economico",
    "entrepreneur": "economico",
    "nurse": "medico", "physio": "medico",
    "psychologist": "psicologico",
    "teacher": "educazione",
    "social-worker": "politico_sociale", "hr": "politico_sociale", "tourism": "politico_sociale",
    "researcher": "scientifico",
    "ux": "arte_design", "graphic": "arte_design", "industrial-design": "arte_design",
    "videomaker": "arte_design",
}

# course-name overrides — AlmaLaurea files these by subject, not by our career
NAME_GROUP = (
    ("statistic", "economico"),      # Statistica / Scienze statistiche
    ("matematic", "scientifico"),
    ("fisica", "scientifico"),
    ("astrofisic", "scientifico"),
    ("scienze fisiche", "scientifico"),
    ("lingue", "linguistico"),       # Lingue e culture per il turismo
    ("informatic", "ict"),
    ("economia", "economico"),
)

NO_DATA_REASON = {
    "polimi": "not_member", "bocconi": "not_member",
    "its-lomb-mecc": "its", "its-rizzoli": "its", "its-energia-pi": "its",
}


def slug_of(course_id):
    """'unibo-p123' → 'unibo' (ITS slugs contain dashes, so split on '-p')."""
    return course_id.rsplit("-p", 1)[0]


def group_of(course, career_id):
    name = (course.get("name") or "").lower()
    for needle, grp in NAME_GROUP:
        if needle in name:
            return grp
    return CAREER_GROUP.get(career_id)


def apply_outcomes():
    courses = json.load(open(os.path.join(DATA, "courses-v2.json"), encoding="utf-8"))
    worlds = json.load(open(os.path.join(DATA, "worlds.json"), encoding="utf-8"))
    al = json.load(open(os.path.join(DATA, "almalaurea.json"), encoding="utf-8"))
    rows = al["rows"]

    # course id → career id, and the career's approximate market pay
    career_of, career_pay = {}, {}
    for w in worlds["worlds"]:
        for c in w["careers"]:
            for cid in c.get("courses", []):
                career_of[cid] = c["id"]
                career_pay[cid] = c.get("netMonthly")

    stats = {"matched": 0, "no_row": 0, "not_member": 0, "its": 0, "unmapped": []}
    for course in courses:
        slug = slug_of(course["id"])
        career_id = career_of.get(course["id"])
        group = group_of(course, career_id)
        level = "LSE" if (course.get("years") or 3) >= 5 else "L"

        # institutions outside the consortium: no data, and we say why
        if slug in NO_DATA_REASON:
            course["outcomes"] = {"status": NO_DATA_REASON[slug]}
            stats[NO_DATA_REASON[slug]] += 1
        else:
            row = rows.get(f"{slug}|{group}|{level}") if group else None
            if not row or row.get("employment_rate") is None:
                course["outcomes"] = {"status": "no_survey", "group": group, "level": level}
                stats["no_row"] += 1
                if not group:
                    stats["unmapped"].append(f"{course['id']} ({career_id})")
            else:
                course["outcomes"] = {
                    "status": "ok",
                    "employment1y": row.get("employment_rate"),
                    "unemployment": row.get("unemployment_rate"),
                    "wouldChooseAgain": row.get("would_choose_again"),
                    "teachSat": row.get("teaching_satisfaction"),
                    "courseSat": row.get("course_satisfaction"),
                    "onTime": row.get("on_time"),
                    "netPay": row.get("net_pay"),
                    "group": group, "level": level,
                    "occYear": row.get("occupazione_year"),
                    "profYear": row.get("profilo_year"),
                    "sourceOcc": row.get("occupazione_source"),
                    "sourceProf": row.get("profilo_source"),
                    "basis": "AlmaLaurea — this university, this subject area, "
                             "graduates of this level surveyed 1 year after graduating",
                }
                stats["matched"] += 1

        # Approximate entry pay for the JOB this course leads to. A career-level
        # market average, identical for every course leading to that job — never
        # presented as a figure measured at this university.
        course["careerPay"] = career_pay.get(course["id"])

        # The old estimated fields are left in place for now so the running app
        # keeps working; STRIP_ESTIMATES removes them in the same commit that
        # switches the UI over to `outcomes`. Nothing reads both.
        if STRIP_ESTIMATES:
            # Only MEASURED claims about this university are removed.
            # handsOn / mastersAccess / mathLoad / selectivity describe the
            # qualification type (an ITS is vocational, a triennale leads to a
            # master's) and stay — they are classification, not measurement.
            for dead in ("employment1y", "salary"):
                course.pop(dead, None)
            env = course.get("env") or {}
            for dead in ("teachSat", "workloadOk", "infraOk", "wouldChooseAgain", "dropout"):
                env.pop(dead, None)
            course["env"] = env
            course.pop("netMonthly", None)

    json.dump(courses, open(os.path.join(DATA, "courses-v2.json"), "w", encoding="utf-8"),
              indent=1, ensure_ascii=False)
    return stats


if __name__ == "__main__":
    print(apply_outcomes())
