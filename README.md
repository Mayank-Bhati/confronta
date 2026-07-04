# Confronta — same data, your lens

Personalized post-diploma path comparison prototype. Pick two paths
(university / ITS); the comparison re-scores each dimension —
admission, affordability, interest match, outcome fit — against the
student's own profile.

**Stack:** Next.js (static export) · Tailwind v4 · deterministic fit
engine in `lib/fitEngine.js` · course data in `data/courses.json`.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `confronta`) and push this folder to `main`.
2. In the repo: **Settings → Pages → Source → GitHub Actions**.
3. Push (or re-run the workflow). Your site goes live at
   `https://<your-username>.github.io/confronta/`.

The workflow in `.github/workflows/deploy.yml` builds the static export
and publishes `out/` automatically on every push to `main`.

## Why no live AI call?

GitHub Pages is a static file server — there is no backend to hide an
API key behind, and a key shipped in browser JS is public. The
"Explain the differences" text is therefore generated deterministically
from the fit engine (see `generateNarrative` in `lib/fitEngine.js`).
To use a real LLM, deploy a tiny proxy (Cloudflare Worker free tier)
that holds the key server-side, and set `AI_PROXY_URL` in
`components/Confronta.jsx`.

## Data

`data/courses.json` holds sample figures modelled on public
AlmaLaurea / MUR ranges — replace with verified data before showing a
real institution.
