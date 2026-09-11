# ATTAbot! Audit Console (dashboard)

The QAPI/ACHC-survey-facing side of the audit system. Reads and reviews the
same Supabase backend (`expert-hospice-audit`) that the Chrome extension
submits audits to.

## Run locally

```
npm install
cp .env.example .env    # already points at the shared project; edit if it moves
npm run dev
```

## Deploy

Push to a repo and deploy on Vercel (or any static host) -- it's a plain
Vite SPA, `vercel.json` already has the client-side routing rewrite. Set the
same two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in the
host's project settings.

## Pages

- **Overview** -- pending review count, confirmed CRITICAL/HIGH count,
  overdue corrective actions, score trend by month, upcoming due list
- **Review Queue** -- every audit submitted by the extension lands here as
  `pending_review`; a reviewer/admin opens one, can edit any finding, and
  Confirms it (only confirmed audits count anywhere else in the app)
- **Findings** -- Fail/Flag counts by checklist item across all confirmed
  audits, sorted highest-first -- the recurring-deficiency trend for QAPI
- **Corrective Actions** -- every confirmed Fail/Flag, owner, due date,
  status, filterable by open/overdue/done
- **Audit Log** -- full searchable history with a print view for the survey
  binder (`window.print()`, `vercel.json`/CSS handle removing chrome)
- **Patients** -- add/manage patients (also usable from the extension)
- **Admin** (admin role only) -- user roles + weekly-digest recipients,
  and checklist rubric weights/guidance/critical-trigger flags -- editing
  the rubric here needs no redeploy

## Roles

`admin` > `reviewer` > `auditor` > `viewer`, enforced by Postgres RLS on the
backend (not just hidden nav items here) -- see the `rls_policies` migration
in the Supabase project for the exact rules.

## First admin account

See the Chrome extension's README for creating the first Supabase Auth user
and promoting it to `admin` via SQL -- that's shared setup for both apps.

## Weekly digest email

The `weekly-digest` Edge Function is deployed but not yet scheduled or
configured with an email provider -- two manual steps in the Supabase
dashboard (Project Settings -> Edge Functions -> Secrets):

1. Add secrets `RESEND_API_KEY` (from resend.com) and `DIGEST_TRIGGER_SECRET`
   (any random string you make up)
2. Database -> Cron Jobs -> New job -> HTTP request to
   `https://ywwdgwiqoeqixmbvibeq.supabase.co/functions/v1/weekly-digest`
   with header `x-digest-secret: <the same random string>`, on whatever
   weekly schedule you want
3. Flag recipients in Admin -> Users -> "Weekly digest" checkbox
