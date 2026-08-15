# Launch setup — the things only the account owner can do

Everything else (code, data, privacy pages) is in the repo.

**Status:** steps 1 and 2 are no longer launch blockers — sign-in sits behind
`SIGN_IN_ENABLED` in `lib/flags.js`, which is `false`, so no student is ever
asked for an email. Do them only when you decide to turn sign-in on. Step 3 is
**done**: the key was deleted at Google, removed from the GitHub secrets and
stripped from `pipeline/.env`, and it was never committed.

## Still open before posting

- **Move hosting off GitHub Pages before making the repo private.** Pages will
  not serve a private repo on the Free plan, so flipping visibility first takes
  the site down. New host (Cloudflare Pages / Netlify, both free from private
  repos) → confirm it loads → then flip.
- **`?src=` tracking**, so LinkedIn traffic can be told apart from friends.

Done already: the three public data tables (`uni_catalog`, `institutions`,
`cities`) are locked to read-only for the anonymous key; AGPL-3.0 is in place
with `data/` reserved.

## 1. Resend account → working sign-in emails (~15 min) — only if enabling sign-in

Without this, only your own email receives OTP codes (Supabase's built-in
mailer is dev-only, ~2–4 emails/hour to the project owner).

1. Create a free account at https://resend.com (100 emails/day free — plenty).
2. Resend dashboard → **API Keys** → Create API key → copy it.
3. Two options for the sender domain:
   - Quick start: use Resend's shared `onboarding@resend.dev` sender (fine for
     testing, looks less trustworthy).
   - Proper: add your domain under **Domains**, set the 3 DNS records they
     show (needs the custom domain from the launch checklist).
4. Supabase dashboard → project `opeplgptrlfptwfyuqlg` → **Authentication →
   Emails → SMTP settings** → Enable custom SMTP:
   - Host: `smtp.resend.com` · Port: `465` · Username: `resend`
   - Password: the API key from step 2
   - Sender email: your verified sender · Sender name: `CareerCompass`

## 2. Supabase auth URLs + email template (~5 min) — LAUNCH BLOCKER

Supabase dashboard → **Authentication → URL Configuration**:
- Site URL: `https://mayank-bhati.github.io/confronta/`
- Redirect URLs: add the same URL (and later the custom domain).

**Authentication → Emails → Magic Link template**: make sure the body contains
`{{ .Token }}` so the email carries the 6-digit code the app asks for, e.g.:

    Your CareerCompass code: {{ .Token }}
    Or open: {{ .ConfirmationURL }}

## 3. Gemini API key — DONE

The key appeared once in terminal error output, so it was treated as exposed
and **deleted rather than rotated**: nothing in `.github/workflows/` referenced
it, and its only consumer was the optional `main.py ingest polimi-llm` subject
enrichment, which `llm_extract.py` skips cleanly when the variable is absent.

Deleted at Google, removed with `gh secret delete GEMINI_API_KEY`, and stripped
from `pipeline/.env`. `git log --all -S"AIza"` is empty — it was never
committed. If the enrichment step is ever needed again, mint a fresh key, put
it in `pipeline/.env` and add it back with `gh secret set GEMINI_API_KEY`.
