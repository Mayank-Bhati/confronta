# CareerCompass — find your world, then your path

Five-stage guidance flow for post-diploma orientation (Italy):

1. **Express** — 20 this-or-that gut choices (12 broad + 8 adaptive on the two leading dimensions), RIASEC-based
2. **Reveal** — identity card + editable profile (the student ratifies what the game inferred)
3. **Discover** — 7 career worlds, 28 careers, ranked by interest similarity
4. **Filter** — environment preferences (budget, distance, city size, path type) prune institutions; soft filters keep near-misses visible with reasons
5. **Compare** — two finalists side by side: interest / outcome / environment fit, reality check, costs, preparation plan

**Stack:** Next.js static export · Tailwind v4 · deterministic engines (no AI, no backend, nothing stored — runs entirely in the browser).

## Structure
```
app/          Next.js entry
components/   CareerCompass.jsx (5-stage flow) · Confronta.jsx (v1 comparator)
lib/          scoreEngine · matchEngine · fitEngine-v2 (pure functions)
data/         questions.json · worlds.json · courses-v2.json · cities.json
```

## Run locally
```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy to GitHub Pages
1. Push this folder to a GitHub repo (branch `main`)
2. Repo **Settings → Pages → Source → GitHub Actions**
3. Live at `https://<username>.github.io/<repo>/` on every push

## Data sources (to replace the modelled sample figures)
- **AlmaLaurea** (almalaurea.it) — per-course graduate surveys: professor satisfaction, workload adequacy, infrastructure, "would choose again", employment and salary at 1/3/5 years. Free per-course summary sheets.
- **Ustat / MUR open data** (ustat.mur.gov.it) — enrollment, completion and dropout per program (ANS).
- **Universitaly** (universitaly.it) — official registry of all degree programs.
- **INDIRE / ITS monitoring** — ITS employment outcomes.
- **O*NET Interest Profiler** (public domain) & **ESCO** (EU open data) — validated interest questions and career↔skill mappings.

Current figures are realistic values modelled on these public sources, labeled as such in the UI. Replace before pitching a named institution.

## Testing with students (checklist)
- Keep the in-app disclaimer visible (anonymous, nothing stored, guidance not advice)
- If testing via a school, share this README's privacy line with them first
- Metrics that matter: survey completion rate; % reaching Worlds; % opening a career they didn't know existed
