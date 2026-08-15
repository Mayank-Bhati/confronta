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

## Data sources
- **AlmaLaurea** (almalaurea.it) — per-course graduate surveys: professor satisfaction, workload adequacy, infrastructure, "would choose again", employment and salary at 1/3/5 years. Free per-course summary sheets.
- **Ustat / MUR open data** (ustat.mur.gov.it) — enrollment, completion and dropout per program (ANS).
- **Universitaly** (universitaly.it) — official registry of all degree programs.
- **INDIRE / ITS monitoring** — ITS employment outcomes.
- **O*NET Interest Profiler** (public domain) & **ESCO** (EU open data) — validated interest questions and career↔skill mappings.

**No figure in this app is modelled or estimated.** Every institution-level
statistic comes from the real AlmaLaurea survey for that university, that
subject group and that course level, and links to the exact page it was read
from. 198 of 229 courses carry real figures; the remaining 31 show no number
and say why instead:

- **ITS academies (14)** — outside AlmaLaurea's scope, which covers university
  graduates only. The card cites INDIRE's national ITS monitoring and labels it
  as a national average, never as this academy's own rate.
- **Politecnico di Milano and Bocconi (13)** — not members of the AlmaLaurea
  consortium (77 members, verified against their published list). Both publish
  their own graduate data; the card links it and states it is measured a
  different way, so it is never mixed into the comparison.
- **Three courses** where AlmaLaurea publishes nothing for that cell. One more
  shows the satisfaction figures it does have, with the employment figure
  marked as suppressed for too few respondents.

Career-level pay is a market average for the *job*, identical for every course
leading to it, and is always labelled approximate — never presented as measured
at a named institution.

## Licence

Code is licensed under **AGPL-3.0** (see `LICENSE`): anyone deploying a
modified version must publish their source.

The datasets in `data/` — in particular `almalaurea.json` and `courses-v2.json`
— are **not** covered by that licence and are reserved. They represent
substantial investment in collecting and verifying published outcome data.
Contact the author for reuse.

## Testing with students (checklist)
- Keep the in-app disclaimer visible (anonymous, nothing stored, guidance not advice)
- If testing via a school, share this README's privacy line with them first
- Metrics that matter: survey completion rate; % reaching Worlds; % opening a career they didn't know existed
