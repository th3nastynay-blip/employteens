/**
 * EMPLOYTEENS — Job URL Verification Engine
 *
 * A job URL is ONLY valid if:
 * 1. The URL responds with HTTP 200 (or 405 for HEAD-blocked endpoints)
 * 2. The URL points to a SPECIFIC job posting (contains a job ID / unique path)
 * 3. The page doesn't redirect to a generic career homepage
 * 4. The page doesn't contain "closed / filled / expired" language
 * 5. (Aggregator sources only) The page content plausibly matches the title/location
 *    we were told the posting has — Adzuna/JSearch point at third-party pages we don't
 *    control, so their title/location claims can drift from the live page.
 *
 * Generic career pages are permanently excluded regardless of HTTP status.
 *
 * NOTE on scope: for ATS-direct sources (Greenhouse/Lever/Ashby/SmartRecruiters) the
 * title/location we ingest comes straight from that ATS's own structured API response —
 * it IS the source of truth, and a posting only appears in that API while it's open. So
 * content-level title/location/closed-text checks are only run for the non-JS-required
 * path (aggregator redirect links), where we're trusting an arbitrary third-party page.
 */

export type VerificationStatus =
  | 'verified'
  | 'generic'
  | 'not_found'
  | 'redirect'
  | 'error'
  | 'unverified'
  | 'mismatch'
  | 'no_apply_mechanism'

export interface VerificationResult {
  status: VerificationStatus
  http_status: number | null
  is_active: boolean
  reason: string
  final_url?: string
  title_match?: boolean
  location_match?: boolean
  has_apply_mechanism?: boolean
}

export interface ExpectedJobMeta {
  title?: string
  location?: string
}

export interface VerifyOptions {
  /**
   * Curated local-source entries (municipal youth programs, rec departments,
   * library programs) point at PROGRAM pages, not ATS postings with job IDs —
   * a specificity check designed for ATS URLs would reject every one of them.
   * Specificity for these was hand-verified at curation time (each URL was
   * confirmed to be the actual program/application page, not a careers
   * homepage). Verification still enforces what automation is FOR here:
   * HTTP liveness, redirect-to-generic detection, and closed/expired-
   * application language. It skips only the job-ID URL pattern requirement
   * and the apply-button text heuristic (municipal pages say "applicants
   * must..." instead of "apply now", which the heuristic misses).
   */
  programPage?: boolean
}

// Patterns that identify generic career homepages (not specific job postings)
// A specific job URL always has a unique identifier in the path.
const GENERIC_PATTERNS: RegExp[] = [
  // Pure domain or trailing slash only
  /^https?:\/\/[^/]+\/?$/,
  // /careers or /career with no job ID after
  /^https?:\/\/[^/]+\/careers?\/?(\?.*)?$/i,
  // /jobs with no specific ID
  /^https?:\/\/[^/]+\/jobs\/?(\?.*)?$/i,
  // /en/careers, /us/en, /us/careers etc
  /^https?:\/\/[^/]+\/[a-z]{2}([-_][a-z]{2})?\/careers?\/?(\?.*)?$/i,
  /^https?:\/\/[^/]+\/[a-z]{2}\/[a-z]{2}\/?\/?(\?.*)?$/i,
  // /job-opportunities, /job-openings (no ID)
  /^https?:\/\/[^/]+\/job[-_]opportunities?\/?(\?.*)?$/i,
  /^https?:\/\/[^/]+\/job[-_]openings?\/?(\?.*)?$/i,
  // /about-us/careers, /home/careers, /company/careers
  /^https?:\/\/[^/]+\/(?:about[-_]us|home|company|about)\/careers?\/?(\?.*)?$/i,
  // /careers/search or /careers/browse (search pages)
  /^https?:\/\/[^/]+\/careers?\/(?:search|browse|explore|all|find)\/?(\?.*)?$/i,
  // Company-specific patterns we've seen
  /^https:\/\/www\.fiveguys\.com\/fans\//i,
  /^https:\/\/www\.subway\.com.*\/CareersAndFranchise\/careers\/?$/i,
  /^https:\/\/jobs\.dominos\.com\/?$/i,
  /^https:\/\/www\.keyfood\.com\/?$/i,
  /^https:\/\/regmovies\.com\/static\/en-US\/careers\/?$/i,
]

// Domains known to require JS rendering — HEAD request alone is insufficient.
// We accept their URLs if they structurally look like specific job postings.
const JS_REQUIRED_DOMAINS = [
  'jobs.lever.co',
  'greenhouse.io',
  'ashbyhq.com',
  'smartrecruiters.com',
  'workday.com',
  'myworkdayjobs.com',
  'icims.com',
  'taleo.net',
  'applytojob.com',
  'breezy.hr',
]

// Patterns that indicate a URL is a specific job posting (has a real job ID)
const SPECIFIC_JOB_PATTERNS: RegExp[] = [
  /\/job[s]?\/\d{4,}/i,                    // /jobs/12345
  /\/job[s]?\/[a-z0-9_-]{8,}/i,            // /jobs/abc123def456
  /\/position\/[a-z0-9_-]+/i,              // /position/cashier-nyc-123
  /\/opening[s]?\/[a-z0-9_-]+/i,           // /openings/barista-hoboken
  /\/posting[s]?\/[a-z0-9_-]+/i,           // /postings/team-member-12345
  /\/[a-f0-9]{8}-[a-f0-9]{4}-/i,           // UUID format
  /\/\d{5,}(?:\/|$|\?)/,                   // 5+ digit numeric ID
  /[?&]jk=[a-z0-9]+/i,                     // Indeed: ?jk=abc123
  /[?&]jobId=\d+/i,                         // ?jobId=12345
  /[?&]job[-_]?id=\d+/i,                   // ?job_id=12345
  /[?&]jid=[a-z0-9]+/i,                    // ZipRecruiter: ?jid=abc123
  /\/view[-_]?job[s]?\//i,                  // /viewjob/
  /greenhouse\.io.*\/jobs\/\d+/i,           // Greenhouse specific
  /lever\.co\/[^/]+\/[a-f0-9-]{36}/i,      // Lever UUID
  /ashbyhq\.com.*\/[a-f0-9-]{36}/i,        // Ashby UUID
  /smartrecruiters\.com\/[^/]+\/\d{5,}/i,  // SmartRecruiters: /{company}/{numeric-id}-{slug}
  /linkedin\.com\/jobs\/view\/[a-z0-9%-]+-\d{6,}/i, // LinkedIn: /jobs/view/{slug}-{long numeric id}
]

// Phrases that indicate a posting is no longer accepting applications, even
// though the page itself returns HTTP 200. These show up on third-party
// aggregator redirect targets (career pages that leave stale URLs live).
const CLOSED_POSTING_PATTERNS: RegExp[] = [
  /no longer (accepting|available|active)/i,
  /position (has been |is )?(filled|closed)/i,
  /this (job|posting|listing|role)\s*(has expired|is no longer available|is closed|has closed)/i,
  /application[s]?\s*(are|is)\s*(now\s*)?closed/i,
  /(job|posting) (has been )?removed/i,
  /posting (has )?expired/i,
  /we('| a)re no longer hiring for this (role|position)/i,
  /this vacancy (is|has) (closed|expired)/i,
  /req(uisition)? (has been )?(closed|cancelled|canceled)/i,
]

// Signals that a page actually has some way to apply — a real job posting
// virtually always mentions one of these somewhere (a button label, a "How to
// Apply" header, an ATS embed, etc). Deliberately a low, forgiving bar: this
// isn't parsing the DOM for a real <button>/<form>, just checking the raw text
// for any application-intent language at all. If NONE of these appear
// anywhere on the page, that's a real red flag worth excluding on, not a false
// positive risk — legitimate postings essentially always clear this.
const APPLY_INDICATOR_PATTERNS: RegExp[] = [
  /\bapply\b/i,
  /submit\s*(your\s*)?(application|resume)/i,
  /send\s*(your\s*)?resume/i,
  /how to apply/i,
  /application form/i,
]

function hasApplyMechanism(text: string): boolean {
  return APPLY_INDICATOR_PATTERNS.some((p) => p.test(text))
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'a', 'an', 'to', 'in', 'at', 'of', 'or', 'is',
  'are', 'part', 'time', 'full', 'per', 'hour', 'job', 'jobs',
])

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

export function isGenericCareerPage(url: string): boolean {
  return GENERIC_PATTERNS.some((p) => p.test(url))
}

export function isSpecificJobPosting(url: string): boolean {
  return SPECIFIC_JOB_PATTERNS.some((p) => p.test(url))
}

export function requiresJSRendering(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return JS_REQUIRED_DOMAINS.some((d) => hostname.includes(d))
  } catch {
    return false
  }
}

function detectClosedPosting(text: string): boolean {
  return CLOSED_POSTING_PATTERNS.some((p) => p.test(text))
}

/**
 * Loose token-overlap check — NOT a guarantee of correctness. HTML structure
 * varies too much across employer sites to do exact matching reliably. This
 * is a soft signal: if a large majority of the significant title words are
 * simply absent from the page text, something is probably wrong (redirected
 * to an unrelated listing, stale aggregator cache, etc).
 */
function checkTitleMatch(pageText: string, expectedTitle: string): boolean {
  const words = significantWords(expectedTitle)
  if (words.length === 0) return true // nothing meaningful to check
  const lowerPage = pageText.toLowerCase()
  const hits = words.filter((w) => lowerPage.includes(w)).length
  return hits / words.length >= 0.4
}

function checkLocationMatch(pageText: string, expectedLocation: string): boolean {
  const words = significantWords(expectedLocation)
  if (words.length === 0) return true
  const lowerPage = pageText.toLowerCase()
  return words.some((w) => lowerPage.includes(w))
}

export async function verifyJobUrl(
  url: string,
  timeoutMs = 6000,
  expected?: ExpectedJobMeta,
  opts?: VerifyOptions,
): Promise<VerificationResult> {
  // Step 1: Reject generic career pages immediately — no network call needed
  if (isGenericCareerPage(url)) {
    return {
      status: 'generic',
      http_status: null,
      is_active: false,
      reason: 'Generic career homepage — not a specific job posting',
    }
  }

  // Step 2: For JS-required ATSs, trust the URL if it has a specific job ID pattern.
  // Title/location came from that same ATS's structured API response, so we don't
  // re-verify content here — the ingest step already has the source of truth.
  if (requiresJSRendering(url)) {
    if (isSpecificJobPosting(url)) {
      return {
        status: 'verified',
        http_status: 200,
        is_active: true,
        reason: 'ATS-hosted specific job posting (JS-rendered, URL pattern verified)',
      }
    } else {
      return {
        status: 'generic',
        http_status: null,
        is_active: false,
        reason: 'ATS page without specific job ID — likely a search/list page',
      }
    }
  }

  // Step 3: Actually fetch the URL for non-ATS links. We GET (not HEAD) here
  // because we need body text to check for closed-posting language and, for
  // aggregator sources, to sanity-check the title/location we were given.
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EmployTeens-Verifier/1.0)',
      },
    })

    clearTimeout(timeout)
    const finalUrl = res.url

    // Check if we were redirected to a generic career page
    if (finalUrl !== url && isGenericCareerPage(finalUrl)) {
      return {
        status: 'redirect',
        http_status: res.status,
        is_active: false,
        reason: `Redirected to generic career page: ${finalUrl}`,
        final_url: finalUrl,
      }
    }

    if (res.status === 404 || res.status === 410) {
      return {
        status: 'not_found',
        http_status: res.status,
        is_active: false,
        reason: `Job posting returned ${res.status} — position no longer exists`,
      }
    }

    if (res.status === 200 || res.status === 405) {
      const isSpecific = opts?.programPage || isSpecificJobPosting(finalUrl || url)
      if (!isSpecific) {
        return {
          status: 'generic',
          http_status: res.status,
          is_active: false,
          reason: 'URL resolves but does not appear to be a specific job posting',
        }
      }

      // Pull body text (best-effort — some 405 responses to GET have no body)
      let bodyText = ''
      try {
        bodyText = await res.text()
      } catch {
        // no body available — fall through with empty text, checks below no-op
      }

      if (bodyText && detectClosedPosting(bodyText)) {
        return {
          status: 'not_found',
          http_status: res.status,
          is_active: false,
          reason: 'Page returned 200 but contains closed/expired/filled application language',
        }
      }

      // Only meaningful when we actually have body text to check — ATS-direct
      // sources never reach this branch (see Step 2 above), so this only
      // applies to aggregator-sourced links where we fetched the real page.
      let has_apply_mechanism: boolean | undefined
      if (bodyText && !opts?.programPage) {
        has_apply_mechanism = hasApplyMechanism(bodyText)
        if (!has_apply_mechanism) {
          return {
            status: 'no_apply_mechanism',
            http_status: res.status,
            is_active: false,
            reason: 'Page loads and matches the posting, but no application mechanism (apply button/link/form language) was found anywhere on it',
            has_apply_mechanism: false,
          }
        }
      }

      let title_match: boolean | undefined
      let location_match: boolean | undefined

      // Skipped in programPage mode: curated entries carry editorial titles
      // ("JC Next Summer Youth Employment (Ages 15–24)") that intentionally
      // won't appear verbatim on the municipal page — token-overlap matching
      // would false-reject them.
      if (bodyText && expected?.title && !opts?.programPage) {
        title_match = checkTitleMatch(bodyText, expected.title)
      }
      if (bodyText && expected?.location && !opts?.programPage) {
        location_match = checkLocationMatch(bodyText, expected.location)
      }

      if (title_match === false || location_match === false) {
        return {
          status: 'mismatch',
          http_status: res.status,
          is_active: false,
          reason: `Page content doesn't match expected ${title_match === false ? 'title' : ''}${
            title_match === false && location_match === false ? ' and ' : ''
          }${location_match === false ? 'location' : ''} — likely stale aggregator link`,
          final_url: finalUrl !== url ? finalUrl : undefined,
          title_match,
          location_match,
        }
      }

      return {
        status: 'verified',
        http_status: res.status,
        is_active: true,
        reason: 'URL verified — specific job posting responds successfully',
        final_url: finalUrl !== url ? finalUrl : undefined,
        title_match,
        location_match,
        has_apply_mechanism,
      }
    }

    if (res.status >= 500) {
      return {
        status: 'error',
        http_status: res.status,
        is_active: false,
        reason: `Server error (${res.status}) — job site may be temporarily down`,
      }
    }

    return {
      status: 'error',
      http_status: res.status,
      is_active: false,
      reason: `Unexpected HTTP status ${res.status}`,
    }
  } catch (err) {
    const isTimeout = String(err).includes('abort') || String(err).includes('timeout')
    return {
      status: 'error',
      http_status: null,
      is_active: false,
      reason: isTimeout ? 'Request timed out' : `Fetch error: ${String(err).slice(0, 100)}`,
    }
  }
}

// Verify a batch of URLs with concurrency control. Jobs from curated local
// sources (source === 'local') must set programPage — without it, re-
// verification would reject their program-page URLs as 'generic' and the
// nightly cleanup would silently deactivate every local job the morning
// after it was ingested.
export async function verifyBatch(
  jobs: { id: string; apply_url: string; title?: string; location?: string; programPage?: boolean }[],
  concurrency = 5,
): Promise<{ id: string; result: VerificationResult }[]> {
  const results: { id: string; result: VerificationResult }[] = []
  const queue = [...jobs]

  async function worker() {
    while (queue.length > 0) {
      const job = queue.shift()
      if (!job) break
      const result = await verifyJobUrl(
        job.apply_url,
        6000,
        { title: job.title, location: job.location },
        job.programPage ? { programPage: true } : undefined,
      )
      results.push({ id: job.id, result })
      // Small delay to avoid hammering servers
      await new Promise((r) => setTimeout(r, 150))
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}
