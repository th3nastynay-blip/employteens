# EmployTeens — Setup Guide

## Stack
- **Frontend**: Next.js 16 App Router + TypeScript + Tailwind + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI**: OpenAI GPT-4o-mini (optional but recommended)
- **Workers**: Node.js + tsx scripts

---

## 1. Clone & Install

```bash
cd "EMPLOYTEENS FINAL"
npm install
```

---

## 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run `supabase/schema.sql`
3. Go to **Storage** → create a bucket named `resumes` (public: false)
4. Copy your project URL and anon key

---

## 3. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...          # Optional — Career AI works without this
CRON_SECRET=any-random-string   # For securing cron endpoints
```

Job API keys (all optional — system works without them, add as you scale):
```
ADZUNA_APP_ID=...
ADZUNA_APP_KEY=...
JSEARCH_API_KEY=...
```

---

## 4. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 5. Populate Jobs (Production Ingestion Pipeline)

There is exactly one job pipeline — the API routes under `/api/ingest/*` — and it
is the only thing allowed to write rows into `jobs`. Every row it writes has
already passed URL verification (`lib/jobs/verify-url.ts`) before insert. There
is no seed/mock data path anymore; if these haven't been run yet, the jobs table
starts empty and stays empty until real listings come in and pass verification.

```bash
# Greenhouse + Lever + Ashby + SmartRecruiters — no API keys needed
curl -X POST http://localhost:3000/api/ingest/ats \
  -H "Authorization: Bearer your-cron-secret"

# Adzuna — needs ADZUNA_APP_ID / ADZUNA_APP_KEY
curl -X POST http://localhost:3000/api/ingest/adzuna \
  -H "Authorization: Bearer your-cron-secret"

# JSearch — needs JSEARCH_API_KEY
curl -X POST http://localhost:3000/api/ingest/jsearch \
  -H "Authorization: Bearer your-cron-secret"
```

In production these run automatically on the schedule in `vercel.json`
(twice daily for Adzuna/ATS, once daily for JSearch given its tighter quota).
`/api/cron/clean-jobs` re-verifies existing listings and deactivates dead ones
every 12 hours. `/api/admin/stats` reports cumulative imported/verified/rejected/
expired/removed counts.

---

## 6. Generate User Feeds

After onboarding users, generate their match feeds:

```bash
curl -X POST http://localhost:3000/api/generate-feed \
  -H "Authorization: Bearer your-cron-secret"
```

---

## 7. Note on Supabase Edge Functions

`supabase/edge-functions/cron-clean-jobs` is a legacy Deno function from an
earlier iteration. It's superseded by `/api/cron/clean-jobs` (scheduled via
`vercel.json`, which is what actually runs in production) and should not be
deployed/scheduled — doing so would run a second, weaker cleanup pass in
parallel that doesn't know about the verification metadata columns.

---

## 8. Deploy to Production

Recommended: [Vercel](https://vercel.com)

```bash
npx vercel
```

Add all env vars in Vercel dashboard → Settings → Environment Variables.

---

## Architecture Overview

```
User → Signup → 13-step Onboarding → Dashboard
                                        ↓
                              AI Feed (match engine)
                                        ↓
                              Job Cards (swipe to save, tap to apply)

Ingestion (Next.js API routes, scheduled via vercel.json):
  /api/ingest/adzuna   → Adzuna search API (major chains) — needs ADZUNA_APP_ID/KEY
  /api/ingest/ats      → Greenhouse + Lever + Ashby + SmartRecruiters — no keys needed
  /api/ingest/jsearch  → JSearch/RapidAPI (Indeed/ZipRecruiter/LinkedIn aggregate) — needs JSEARCH_API_KEY
  /api/cron/clean-jobs → Re-verifies existing listings, deactivates dead/expired ones, every 12h
  /api/admin/purge-jobs → One-time/manual: hard-deletes generic-URL or curated-source rows
  /api/admin/stats     → Cumulative imported/verified/rejected/expired/removed report
  /api/admin/qa-report → Samples active jobs, re-verifies, auto-deactivates failures

All scoring/verification logic (teen-friendliness, scam risk, URL verification,
normalization) lives in lib/jobs/*.ts and is shared across every ingestion route —
there is exactly one code path that can write into the jobs table.
```

---

## Feature Status

| Feature | Status |
|---|---|
| Onboarding (CalAI style) | ✅ |
| AI Job Feed + Match Scores | ✅ |
| Job Cards (save, apply) | ✅ |
| Career AI (resume, interview, strategy) | ✅ |
| Profile page | ✅ |
| Supabase Auth (email/password) | ✅ |
| Database Schema | ✅ |
| Job Ingestion Workers | ✅ |
| Deduplication Engine | ✅ |
| Job Cleaning Cron | ✅ |
| Anti-Scam Scoring | ✅ |
| PWA + Service Worker | ✅ |
| Admin Dashboard | ✅ |
| Push Notifications | ✅ (infrastructure ready) |
| Vector Similarity Search | 🔧 (schema ready, needs OpenAI embeddings) |
