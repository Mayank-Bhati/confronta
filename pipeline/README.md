# CareerCompass Data Pipeline

Ingests real Italian higher-education data (universities → bachelor programmes →
per-year subjects with ECTS) into a database, and exports app-shaped JSON for
review before anything reaches the website.

## Status (first run, 6 Jul 2026, from local machine)

| Source | Result |
|---|---|
| Politecnico di Torino | 24 programmes, **839 subject rows** (full curricula with ECTS), 0 errors |
| Politecnico di Milano | 29 programmes with exact per-programme URLs (curricula need the Manifesto extractor or the LLM step) |
| MUR Open Data (full Italian catalog) | ingester ready; portal is unreachable from non-EU networks → run from the EU-region backend |
| Universitaly | behind a WAF (HTTP 202 challenge); adapter planned — best source for subjects nationwide |

## Quick start

```bash
cd pipeline
pip install -r requirements.txt
python3 main.py init             # create tables (SQLite file data.db by default)
python3 main.py ingest polito    # full catalog + curricula (~2 min, rate-limited)
python3 main.py ingest polimi    # programme rows with exact URLs
python3 main.py stats
python3 main.py export           # → out/programs-preview.json (review before shipping)
```

## Hosted database (when ready)

Create a free Postgres on Supabase or Neon, then:

```bash
pip install psycopg2-binary
export DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/db
python3 main.py init && python3 main.py ingest polito
```

Nothing else changes — the schema is portable SQLAlchemy.

## LLM extraction step (optional, free tier)

`careercompass_pipeline/llm_extract.py` turns messy curriculum pages into
structured subject rows using Gemini 1.5 Flash. Set `GEMINI_API_KEY`
(https://aistudio.google.com/apikey) to enable; without a key the step is
skipped. Intended for universities without clean tables (e.g. PoliMi Manifesto
pages).

## Design

- `careercompass_pipeline/db.py` — schema: `institutions`, `programs`
  (exact `url` + `curriculum_url` per programme), `program_subjects`
  (track/year/code/name/ECTS), `fetch_log` (every HTTP request is recorded —
  provenance for verification).
- `careercompass_pipeline/http.py` — polite client: identifies itself,
  1 req/sec, logs every fetch.
- `careercompass_pipeline/adapters/` — one adapter per source. Curriculum
  page formats differ per university, so each university gets a small adapter;
  sources with no clean structure go through the LLM extractor instead.
- `careercompass_pipeline/export_app_json.py` — DB → `out/programs-preview.json`
  in the shape the app's `data/*.json` uses. The website only changes when a
  reviewed export is copied over.

## Roadmap

1. EU-region deploy (Cloud Run/Render) → run the MUR ingester for the FULL
   Italian catalog (every accredited course).
2. Universitaly adapter → subjects + employment stats nationwide.
3. AlmaLaurea per-course outcomes adapter.
4. ITS foundations (regional sites; ~150 foundations).
5. Scheduled re-runs + diff report (data changes every academic year).
6. FastAPI read API if/when the app stops being fully static.
