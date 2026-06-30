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

## 5. Seed Initial Jobs

Run any worker to populate the DB with jobs:

```bash
# Scrape enterprise employers (Chipotle, Starbucks, McDonald's, etc.)
npm run workers:scrape

# Generate local business listings
npx tsx workers/scrape-local-business.ts

# Pull from APIs (needs API keys)
npm run workers:ingest
```

---

## 6. Generate User Feeds

After onboarding users, generate their match feeds:

```bash
curl -X POST http://localhost:3000/api/generate-feed \
  -H "Authorization: Bearer your-cron-secret"
```

---

## 7. Deploy Edge Functions (Supabase)

```bash
# Install Supabase CLI
npm install -g supabase

# Deploy cleanup cron (runs every 12 hours)
supabase functions deploy cron-clean-jobs
supabase functions schedule add cron-clean-jobs --cron "0 */12 * * *"

# Deploy feed generation cron (runs 6am daily)
supabase functions deploy cron-generate-feed
supabase functions schedule add cron-generate-feed --cron "0 11 * * *"
# (6am EST = 11am UTC)
```

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

Workers (Node.js):
  ingest-apis.ts      → Adzuna, JSearch, USAJobs, Greenhouse, Lever
  scrape-employers.ts → Chipotle, Starbucks, McDonald's, AMC, etc.
  scrape-local.ts     → NY/NJ cafes, gyms, restaurants
  job-enricher.ts     → AI scores all jobs (teen-friendly, scam risk, etc.)
  job-cleaner.ts      → Removes dead/expired jobs every 12h
  dedup-engine.ts     → Prevents duplicate job entries

Edge Functions (Supabase):
  cron-clean-jobs     → Runs every 12 hours
  cron-generate-feed  → Runs at 6am daily
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
