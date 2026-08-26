"""Read the anonymous funnel out of the events table.

The site writes events with the public key, which has INSERT and no SELECT —
students' rows can never be read back by anything holding the key that ships in
the browser bundle. Reading them therefore has to happen from a connection that
owns the table, which is what the pipeline already has.

Nothing here prints a session id, a free-text field or anything that could
identify a person: only counts, dates and the coarse step names the tracker was
designed around.

    python3 main.py monitoring [days]
"""
from sqlalchemy import text

from .db import Session

# The journey in the order a student walks it, so gaps read top to bottom.
FUNNEL = [
    ("landed", "opened the site"),
    ("survey_started", "started the survey"),
    ("survey_completed", "finished the survey"),
    ("stage_reveal", "saw their result"),
    # There is no "opened a world" step and there cannot be one: worlds and
    # their careers share a single page, so choosing a world expands it in
    # place and choosing a career jumps straight to the course list. The first
    # version of this report listed stage_careers and reported it as a 100%
    # drop-off, which was an artefact of the list, not something students did.
    ("stage_worlds", "opened the worlds list"),
    ("stage_filter", "reached the course list"),
    ("stage_saved", "opened their saved paths"),
    ("course_saved", "saved a course"),
    ("stage_compare", "compared two"),
    ("tournament_started", "ran the tournament"),
    ("champion_crowned", "crowned a winner"),
    ("final_choice", "recorded a final choice"),
    ("feedback_sent", "sent feedback"),
]


def _rows(s, sql, **kw):
    return s.execute(text(sql), kw).fetchall()


def report(days=30):
    out = []
    with Session() as s:
        total, sessions, first, last = _rows(s, """
            select count(*), count(distinct session_id), min(created_at), max(created_at)
            from events where created_at > now() - (:d || ' days')::interval
        """, d=str(days))[0]
        out.append(f"window: last {days} days")
        out.append(f"rows: {total}   distinct sessions: {sessions}")
        out.append(f"first: {first}   last: {last}")

        if not total:
            out.append("\nNo events recorded in this window.")
            return "\n".join(out)

        out.append("\nsessions per day")
        for d, n, e in _rows(s, """
            select created_at::date, count(distinct session_id), count(*)
            from events where created_at > now() - (:d || ' days')::interval
            group by 1 order by 1
        """, d=str(days)):
            out.append(f"  {d}   {n:3} sessions   {e:4} events")

        counts = dict(_rows(s, """
            select step, count(distinct session_id)
            from events where created_at > now() - (:d || ' days')::interval
            group by 1
        """, d=str(days)))

        out.append("\nfunnel (distinct sessions reaching each step)")
        prev = None
        for step, label in FUNNEL:
            n = counts.get(step, 0)
            if n == 0 and prev is None:
                continue
            drop = ""
            if prev:
                lost = prev - n
                drop = f"   -{lost} ({round(lost / prev * 100)}% lost)" if lost > 0 else ""
            out.append(f"  {n:4}  {label:28}{drop}")
            prev = n or prev

        seen = set(dict(counts))
        extra = seen - {k for k, _ in FUNNEL}
        if extra:
            out.append("\nsteps recorded but not in the funnel list")
            for k in sorted(extra):
                out.append(f"  {counts[k]:4}  {k}")

        out.append("\ndevice / language")
        for label, n in _rows(s, """
            select coalesce(device, '?') || ' · ' || coalesce(lang, '?'), count(distinct session_id)
            from events where created_at > now() - (:d || ' days')::interval
            group by 1 order by 2 desc
        """, d=str(days)):
            out.append(f"  {n:4}  {label}")

        out.append("\nwhat they engaged with (coarse ids only)")
        for step, detail, n in _rows(s, """
            select step, detail, count(*) from events
            where created_at > now() - (:d || ' days')::interval and detail is not null
            group by 1,2 order by 3 desc limit 20
        """, d=str(days)):
            out.append(f"  {n:4}  {step:22} {detail}")

        out.append("\nhow far each session got")
        for reached, n in _rows(s, """
            with last_step as (
              select session_id,
                     max(case step
                           when 'landed' then 1 when 'survey_started' then 2
                           when 'survey_completed' then 3 when 'stage_reveal' then 4
                           when 'stage_worlds' then 5 when 'stage_saved' then 6
                           when 'stage_filter' then 7 when 'course_saved' then 8
                           when 'stage_compare' then 9 when 'final_choice' then 10
                           else 0 end) as depth
              from events where created_at > now() - (:d || ' days')::interval
              group by 1)
            select depth, count(*) from last_step group by 1 order by 1
        """, d=str(days)):
            names = {0: "(unknown step only)", 1: "landed and left", 2: "abandoned mid-survey",
                     3: "finished survey, went no further", 4: "saw result, stopped",
                     5: "browsed worlds", 6: "opened saved paths", 7: "reached courses",
                     8: "saved something", 9: "compared", 10: "made a final choice"}
            out.append(f"  {n:4}  {names.get(reached, reached)}")
    return "\n".join(out)


def sessions(days=30):
    """One line per session, so test traffic can be told from real traffic.

    Session ids are hashed before printing: enough to tell rows apart, not
    enough to follow a person, and the report is only ever read by us.
    """
    out = []
    with Session() as s:
        rows = _rows(s, """
            select session_id,
                   min(created_at)::date as day,
                   count(*) as n,
                   min(created_at)::time(0) as t0,
                   max(created_at)::time(0) as t1,
                   coalesce(max(lang),'?') as lang,
                   coalesce(max(device),'?') as device,
                   string_agg(distinct step, ',' order by step) as steps
            from events where created_at > now() - (:d || ' days')::interval
            group by 1 order by 2, 4
        """, d=str(days))
        out.append(f"{len(rows)} sessions")
        for sid, day, n, t0, t1, lang, dev, steps in rows:
            mark = " <= PROBE" if any(x in (sid or "") for x in
                   ("audit", "stability", "probe", "finalcheck")) or "rls_probe" in (steps or "") else ""
            out.append(f"  {day} {t0}-{t1} {n:3}ev {dev:7} {lang:2} {(steps or '')[:110]}{mark}")
    return "\n".join(out)


def as_json(days=30):
    """The same figures as report(), shaped for the dashboard page.

    Sessions that only ever recorded a probe step are excluded: the security
    audit and my own live tests wrote real rows, and leaving them in overstates
    every number at exactly the sample size where that matters most.
    """
    import json as _json
    with Session() as s:
        probe = """ and session_id not in (
            select distinct session_id from events
            where step in ('rls_probe','x') or session_id ~ '^(audit|stability|finalcheck|rlsprobe)')"""
        win = "created_at > now() - (:d || ' days')::interval"
        tot, ses, first, last = _rows(s, f"""
            select count(*), count(distinct session_id), min(created_at), max(created_at)
            from events where {win}{probe}""", d=str(days))[0]
        steps = dict(_rows(s, f"""
            select step, count(distinct session_id) from events
            where {win}{probe} group by 1""", d=str(days)))
        daily = [{"day": str(d), "sessions": n, "events": e} for d, n, e in _rows(s, f"""
            select created_at::date, count(distinct session_id), count(*) from events
            where {win}{probe} group by 1 order by 1""", d=str(days))]
        devices = [{"label": lbl, "sessions": n} for lbl, n in _rows(s, f"""
            select coalesce(device,'unknown'), count(distinct session_id) from events
            where {win}{probe} group by 1 order by 2 desc""", d=str(days))]
        langs = [{"label": lbl, "sessions": n} for lbl, n in _rows(s, f"""
            select coalesce(lang,'not set'), count(distinct session_id) from events
            where {win}{probe} group by 1 order by 2 desc""", d=str(days))]
        details = [{"step": st, "detail": dt, "n": n} for st, dt, n in _rows(s, f"""
            select step, detail, count(*) from events
            where {win}{probe} and detail is not null group by 1,2 order by 3 desc limit 15""",
            d=str(days))]
        depth = [{"depth": d, "sessions": n} for d, n in _rows(s, f"""
            with ls as (select session_id, max(case step
                  when 'landed' then 1 when 'survey_started' then 2
                  when 'survey_completed' then 3 when 'stage_reveal' then 4
                  when 'stage_worlds' then 5 when 'stage_filter' then 6
                  when 'course_saved' then 7 when 'stage_compare' then 8
                  when 'final_choice' then 9 else 0 end) as depth
                from events where {win}{probe} group by 1)
            select depth, count(*) from ls group by 1 order by 1""", d=str(days))]
    return _json.dumps({
        "days": days, "totalEvents": tot or 0, "sessions": ses or 0,
        "first": str(first) if first else None, "last": str(last) if last else None,
        "funnel": [{"step": k, "label": lbl, "sessions": steps.get(k, 0)} for k, lbl in FUNNEL],
        "daily": daily, "devices": devices, "languages": langs,
        "details": details, "depth": depth,
    }, indent=1)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2 and sys.argv[2] == "json":
        print(as_json(int(sys.argv[1])))
    elif len(sys.argv) > 2 and sys.argv[2] == "sessions":
        print(sessions(int(sys.argv[1])))
    else:
        print(report(int(sys.argv[1]) if len(sys.argv) > 1 else 30))
