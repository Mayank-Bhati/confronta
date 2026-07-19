# Launch setup — the three things only the account owner can do

Everything else (code, data, privacy pages) is in the repo. These three need
your logins — about 30 minutes total. When step 1 is done, hand the API key
over (paste it into `pipeline/.env` as `RESEND_API_KEY=...`, never into chat
or a commit) and the SMTP wiring can be finished for you.

## 1. Resend account → working sign-in emails (~15 min) — LAUNCH BLOCKER

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

## 3. Rotate the Gemini API key (~5 min)

The current key appeared once in terminal error output, so treat it as
exposed. In https://aistudio.google.com → API keys: create a new key, delete
the old one, update `GEMINI_API_KEY=` in `pipeline/.env`, and update the
GitHub secret: `gh secret set GEMINI_API_KEY` (paste when prompted).
