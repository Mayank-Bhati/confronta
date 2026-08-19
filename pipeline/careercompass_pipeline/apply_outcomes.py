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

INDIRE = {"courses": {}, "institutions": {}, "source": ""}
NATIONAL = {}

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
    # New careers. Their AlmaLaurea groups were only added once the codes had
    # been read off the site's own dropdown, so none of these is a guess.
    "doctor": "medico", "dentist": "medico", "pharmacist": "medico",
    "vet": "agrario_veterinario", "agronomist": "agrario_veterinario",
    "lawyer": "giuridico",
    "architect": "ing_civ",
    "sport-scientist": "scienze_motorie",
    "translator": "linguistico",
}

# Careers whose degree is a single-cycle (ciclo unico) qualification: the
# outcomes lookup must ask for level LSE, not L, regardless of course length
# recorded in the catalogue.
LSE_CAREERS = {"doctor", "dentist", "vet", "lawyer", "teacher"}

# course-name overrides — AlmaLaurea files these by subject, not by our career
# First match wins, so the engineering rules must precede "informatic":
# AlmaLaurea files Ingegneria Informatica (L-8) under group 12, engineering,
# and reserves group 10 for Scienze informatiche (L-31). Sending a
# politecnico's computer engineering to group 10 asked for a cell that does
# not exist and produced a spurious "no survey data".
NAME_GROUP = (
    ("computer engineering", "ing_ind"),
    ("ingegneria informatica", "ing_ind"),
    ("statistic", "economico"),      # Statistica / Scienze statistiche
    ("matematic", "scientifico"),
    ("mathematic", "scientifico"),   # catalogue carries English course names too
    ("fisica", "scientifico"),
    ("physics", "scientifico"),
    ("astrofisic", "scientifico"),
    ("scienze fisiche", "scientifico"),
    ("lingue", "linguistico"),       # Lingue e culture per il turismo
    ("informatic", "ict"),
    ("economia", "economico"),
)

# our institution slug → AlmaLaurea ateneo code (national dataset is keyed by
# code, so it stays valid however we name institutions internally)
ATENEO_CODE = {
    "polito": "70032", "unito": "70031", "unimib": "70132", "unimi": "70015",
    "sapienza": "70026", "federico2": "70018", "unibo": "70003", "unifi": "70010",
    "unipa": "70020", "uniba": "70002",
    "unipd": "70019", "unipi": "70024", "unige": "70011", "univr": "70040",
    "unitn": "70062", "unipv": "70022", "unipr": "70021", "unict": "70008",
    "unica": "70004", "unisa": "70028",
}

NO_DATA_REASON = {
    "polimi": "not_member", "bocconi": "not_member",
    "its-lomb-mecc": "its", "its-rizzoli": "its", "its-energia-pi": "its",
}


def _afam(slug):
    """Conservatori, accademie and ISIA — the AFAM sector.

    AlmaLaurea surveys university graduates only. Its 2012 agreement with 21
    AFAM institutions is published on its own site as "in fase di rinnovo e
    rilancio" with no members listed, and INDIRE covers ITS rather than AFAM,
    so for these courses no outcome source exists at all. Saying so is the only
    honest option; there is nothing to substitute.
    """
    return slug.startswith(("cons-", "aba-", "isia-", "afam-"))


def slug_of(course_id):
    """'unibo-p123' → 'unibo' (ITS slugs contain dashes, so split on '-p')."""
    return course_id.rsplit("-p", 1)[0]


def group_of(course, career_id):
    name = (course.get("name") or "").lower()
    for needle, grp in NAME_GROUP:
        if needle in name:
            return grp
    return CAREER_GROUP.get(career_id)


def national_medians(rows):
    """Median of every university that does publish a given group and level.

    For the courses where this institution has no figure of its own, this is
    the honest substitute: it describes the subject nationally, never this
    university, and the card says so. It is computed from the same verified
    AlmaLaurea rows the rest of the site uses, so it carries the same
    provenance rather than importing a second, incomparable source.
    """
    import statistics
    buckets = {}
    for r in rows.values():
        key = (r.get("group"), r.get("level"))
        buckets.setdefault(key, {"emp": [], "pay": [], "again": []})
        for field, dest in (("employment_rate", "emp"), ("net_pay", "pay"),
                            ("would_choose_again", "again")):
            if r.get(field) is not None:
                buckets[key][dest].append(r[field])
    out = {}
    for key, vals in buckets.items():
        if len(vals["emp"]) < 5:      # too few universities to call it national
            continue
        out[key] = {
            "rate": round(statistics.median(vals["emp"]), 1),
            "universities": len(vals["emp"]),
            "pay": round(statistics.median(vals["pay"])) if vals["pay"] else None,
            "again": round(statistics.median(vals["again"]), 1) if vals["again"] else None,
        }
    return out


def apply_outcomes():
    courses = json.load(open(os.path.join(DATA, "courses-v2.json"), encoding="utf-8"))
    worlds = json.load(open(os.path.join(DATA, "worlds.json"), encoding="utf-8"))
    al = json.load(open(os.path.join(DATA, "almalaurea.json"), encoding="utf-8"))
    global INDIRE
    INDIRE = json.load(open(os.path.join(DATA, "indire-its.json"), encoding="utf-8"))
    rows = al["rows"]
    global NATIONAL
    NATIONAL = national_medians(rows)

    # course id → career id, and the career's approximate market pay
    career_of, career_pay = {}, {}
    for w in worlds["worlds"]:
        for c in w["careers"]:
            for cid in c.get("courses", []):
                career_of[cid] = c["id"]
                career_pay[cid] = c.get("netMonthly")

    stats = {"matched": 0, "partial": 0, "no_row": 0, "not_member": 0, "its": 0, "unmapped": []}
    for course in courses:
        slug = slug_of(course["id"])
        career_id = career_of.get(course["id"])
        group = group_of(course, career_id)
        level = "LSE" if (career_id in LSE_CAREERS or (course.get("years") or 3) >= 5) else "L"

        # institutions outside the consortium: no data, and we say why
        if slug in NO_DATA_REASON and NO_DATA_REASON[slug] == "its":
            # INDIRE monitors ITS on the Ministry's behalf and publishes a
            # per-course ranking, so "its" is no longer a bare absence: it
            # carries this course's own figures where the row is identifiable
            # beyond doubt, and its academy's total otherwise.
            o = {"status": "its"}
            per = INDIRE["courses"].get(course["id"])
            inst = INDIRE["institutions"].get(slug)
            if per:
                # rank and efficacia are absent when the course was monitored as
                # two sections: two rows carry two ranks, and neither is this
                # course's, so nothing is shown rather than one picked at whim
                o.update({"itsRate": per["rate"], "itsOf": per["of"], "itsScope": "course",
                          "itsDiplomati": per["diplomati"]})
                for k_src, k_dst in (("rank", "itsRank"), ("efficacia", "itsEfficacia"),
                                     ("sections", "itsSections")):
                    if per.get(k_src) is not None:
                        o[k_dst] = per[k_src]
            elif inst and inst.get("rate") is not None:
                # No rank at institution scope. The academy's best rank beside
                # its average rate reads as this course's rank: "AI & Robotics,
                # 75.5%, 5th of 506" would be two true numbers making one false
                # claim, since 5th belongs to the Cyber Defense course.
                o.update({"itsRate": inst["rate"], "itsScope": "institution",
                          "itsCourses": inst["courses"], "itsDiplomati": inst["diplomati"]})
            o["itsSource"] = INDIRE["source"]
            course["outcomes"] = o
            stats["its"] += 1
        elif _afam(slug):
            course["outcomes"] = {"status": "afam"}
            stats["afam"] = stats.get("afam", 0) + 1
        elif slug in NO_DATA_REASON:
            o = {"status": NO_DATA_REASON[slug], "group": group, "level": level}
            nat = NATIONAL.get((group, level))
            if nat:
                o.update({"natRate": nat["rate"], "natUniversities": nat["universities"],
                          "natPay": nat["pay"], "natAgain": nat["again"]})
            course["outcomes"] = o
            stats[NO_DATA_REASON[slug]] += 1
        else:
            code = ATENEO_CODE.get(slug)
            row = rows.get(f"{code}|{group}|{level}") if (code and group) else None
            # AlmaLaurea suppresses employment figures for groups with too few
            # respondents while still publishing the graduate profile. Treating
            # that as "no data" threw away real satisfaction numbers, so a course
            # with a partial row now keeps what exists and says what is missing.
            has_profile = row is not None and any(
                row.get(k) is not None
                for k in ("would_choose_again", "course_satisfaction", "teaching_satisfaction", "on_time"))
            if not row or (row.get("employment_rate") is None and not has_profile):
                o = {"status": "no_survey", "group": group, "level": level}
                nat = NATIONAL.get((group, level))
                if nat:
                    o.update({"natRate": nat["rate"], "natUniversities": nat["universities"],
                              "natPay": nat["pay"], "natAgain": nat["again"]})
                course["outcomes"] = o
                stats["no_row"] += 1
                if not group:
                    stats["unmapped"].append(f"{course['id']} ({career_id})")
            else:
                course["outcomes"] = {
                    "status": "ok" if row.get("employment_rate") is not None else "partial",
                    "employment1y": row.get("employment_rate"),
                    "unemployment": row.get("unemployment_rate"),
                    "wouldChooseAgain": row.get("would_choose_again"),
                    "teachSat": row.get("teaching_satisfaction"),
                    "courseSat": row.get("course_satisfaction"),
                    "onTime": row.get("on_time"),
                    "netPay": row.get("net_pay"),
                    # Why a low "working" share is not bad news on a 3-year
                    # degree: most graduates enrol straight into a master's.
                    "continuingMasters": (
                        None if row.get("studying_only") is None and row.get("working_studying") is None
                        else round((row.get("studying_only") or 0) + (row.get("working_studying") or 0), 1)),
                    "workingOnly": row.get("working_only"),
                    "group": group, "level": level,
                    "occYear": row.get("occupazione_year"),
                    "profYear": row.get("profilo_year"),
                    "sourceOcc": row.get("occupazione_source"),
                    "sourceProf": row.get("profilo_source"),
                    "basis": "AlmaLaurea — this university, this subject area, "
                             "graduates of this level surveyed 1 year after graduating",
                }
                stats["matched" if row.get("employment_rate") is not None else "partial"] += 1

        # Medicine, Dentistry and Veterinary carry their own admission type.
        # The seeder sets it, but the database still holds the pre-reform value
        # for rows written before that change, and every re-export restored
        # "national" — which the card renders as "National admission test", the
        # exact claim the 2025 reform made false. Correcting it here means the
        # fix survives a re-export instead of being a manual edit that silently
        # reverts, as it already did once.
        if str(course.get("test", "")).startswith("Semestre aperto"):
            course["admission"] = "semestre"
            course["test"] = ("Semestre aperto: enrol freely, sit Chemistry, Physics and "
                              "Biology, then a national ranking on those exam scores "
                              "decides who continues")

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
