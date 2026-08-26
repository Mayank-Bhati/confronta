# Watching the two-week student test

Every meaningful step a student takes is written to the `events` table:
anonymous, no cookies, no personal data, write-only (nobody can read it from a
browser). Run these in the **Supabase dashboard → SQL Editor**.

## The funnel — the one query that matters

Where do students stop?

```sql
select step, count(distinct session_id) as students
from events
where created_at > now() - interval '14 days'
group by step
order by students desc;
```

Read it top to bottom: `landed` → `survey_started` → `survey_completed` →
`stage_reveal` → `stage_worlds` → `stage_filter` → `course_saved` →
`stage_compare` → `final_choice`. The biggest drop between two consecutive
steps is the thing to fix next.

## Completion rate

```sql
select
  count(distinct session_id) filter (where step = 'landed')            as arrived,
  count(distinct session_id) filter (where step = 'survey_started')    as started,
  count(distinct session_id) filter (where step = 'survey_completed')  as finished,
  count(distinct session_id) filter (where step = 'course_saved')      as saved_a_course,
  count(distinct session_id) filter (where step = 'final_choice')      as chose
from events where created_at > now() - interval '14 days';
```

## Phone vs desktop, and language

```sql
select device, lang, count(distinct session_id) as students
from events where created_at > now() - interval '14 days'
group by device, lang order by students desc;
```

## Which careers and courses actually get opened

```sql
select step, detail, count(*) as times
from events
where step in ('course_saved', 'final_choice', 'course_reopened')
  and created_at > now() - interval '14 days'
group by step, detail order by times desc limit 25;
```

## How far a single student got (useful when someone reports a problem)

```sql
select created_at, step, detail
from events where session_id = 'PASTE_SESSION_ID'
order by created_at;
```

## Feedback they wrote

```sql
select created_at, message, contact, page, lang
from feedback order by id desc;
```

## Charting it

Supabase can save any of these as a chart: run the query, then **Save as
report** in the SQL Editor. A saved funnel query on the dashboard is the
closest thing to Grafana without running any infrastructure.


## The visual dashboard

Ask for "the funnel" or "the dashboard" and it regenerates end to end:

1. `gh workflow run data-pipeline.yml -f task=monitoring` — runs the query as the
   table owner, since the public key can write to `events` and never read it back
2. downloads `monitoring.json` from the run artifact
3. rebuilds `docs/funnel-dashboard.html` from it
4. republishes to the same Artifact URL

Probe sessions are excluded automatically: anything that only ever logged
`rls_probe`/`x`, or whose session id starts with audit/stability/finalcheck.

Three views from the CLI if you want the raw numbers:

    python main.py monitoring 30            # the funnel as text
    python main.py monitoring 30 sessions   # one line per session
    python main.py monitoring 60 json       # what the dashboard renders

A caution the dashboard repeats: below roughly a hundred sessions the
percentages are noise. Read the shape, not the decimals.
