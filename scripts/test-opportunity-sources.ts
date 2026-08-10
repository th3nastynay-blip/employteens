/**
 * EMPLOYTEENS — opportunity seed integrity tests
 *
 *   npx tsx scripts/test-opportunity-sources.ts
 *
 * These do not test logic, they test the DATA. Every failure here is a row that
 * would either be rejected by the database CHECK constraint or, worse, would be
 * shown to a teen it doesn't apply to. That second case is the one that put a
 * German-language Berlin competition at the top of a Jersey City sophomore's
 * roadmap on the site we're learning from.
 */

import {
  OPPORTUNITY_SOURCES,
  inSeasonOpportunities,
  outOfSeasonOpportunities,
} from '../lib/jobs/opportunity-sources'

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  — ${detail}`}`)
}

console.log(`— ${OPPORTUNITY_SOURCES.length} entries —\n`)

console.log('— required eligibility fields (enforced by CHECK constraint) —')
for (const o of OPPORTUNITY_SOURCES) {
  const ok =
    !!o.delivery &&
    Array.isArray(o.eligible_regions) &&
    o.eligible_regions.length > 0 &&
    typeof o.min_grade === 'number' &&
    typeof o.max_grade === 'number'
  check(`${o.slug} declares delivery, regions and grades`, ok)
}

console.log('\n— grade ranges are sane —')
for (const o of OPPORTUNITY_SOURCES) {
  check(
    `${o.slug} grades ${o.min_grade}-${o.max_grade}`,
    o.min_grade >= 6 && o.max_grade <= 12 && o.min_grade <= o.max_grade,
  )
}

console.log('\n— rung ranges are sane —')
for (const o of OPPORTUNITY_SOURCES) {
  check(
    `${o.slug} rungs ${o.rung_from}-${o.rung_to}`,
    o.rung_from >= 0 && o.rung_to <= 7 && o.rung_from <= o.rung_to,
  )
}

console.log('\n— no invented deadlines —')
for (const o of OPPORTUNITY_SOURCES) {
  // The whole point: congressionalappchallenge.us was still showing 2025 dates
  // in August 2026. We store the recurring pattern, never a specific date.
  check(`${o.slug} has a windowNote instead of a hardcoded date`, o.windowNote.length > 10)
  check(
    `${o.slug} windowNote does not contain a bare year`,
    !/\b20\d{2}\b/.test(o.windowNote),
    o.windowNote,
  )
}

console.log('\n— slugs and URLs unique and well formed —')
const slugs = new Set<string>()
const urls = new Set<string>()
for (const o of OPPORTUNITY_SOURCES) {
  check(`${o.slug} slug is unique`, !slugs.has(o.slug))
  slugs.add(o.slug)
  check(`${o.slug} url is https`, o.apply_url.startsWith('https://'), o.apply_url)
  check(`${o.slug} url is unique`, !urls.has(o.apply_url))
  urls.add(o.apply_url)
}

console.log('\n— cost is stated or explicitly unknown, never guessed —')
for (const o of OPPORTUNITY_SOURCES) {
  const stated = o.cost_cents === null || typeof o.cost_cents === 'number'
  const explicitlyUnknown = o.cost_cents === undefined
  check(`${o.slug} cost is ${stated ? 'stated' : 'marked unknown'}`, stated || explicitlyUnknown)
}

console.log('\n— evidence honesty —')
// An open, self-paced, everyone-welcome course cannot produce a reference.
// Claiming otherwise is the thing that makes a ladder fake.
for (const o of OPPORTUNITY_SOURCES) {
  if (o.delivery === 'virtual' && o.recurrence === 'rolling') {
    check(
      `${o.slug} (open + self-paced) does not claim to produce a reference`,
      o.evidence_kind !== 'reference',
      `claims ${o.evidence_kind}`,
    )
  }
}
check(
  'at least one entry produces a real reference',
  OPPORTUNITY_SOURCES.some((o) => o.evidence_kind === 'reference'),
)
check(
  'at least one entry is open at grade 8 or below, for the youngest users',
  OPPORTUNITY_SOURCES.some((o) => o.min_grade <= 8),
)
check(
  'at least one entry is free, local and in person',
  OPPORTUNITY_SOURCES.some(
    (o) => o.cost_cents === null && o.delivery === 'in_person' && o.eligible_regions.some((r) => r.startsWith('US-')),
  ),
)

console.log('\n— seasonality partitions cleanly —')
for (const m of [1, 4, 7, 10]) {
  const a = inSeasonOpportunities(m).length
  const b = outOfSeasonOpportunities(m).length
  check(`month ${m}: ${a} in season + ${b} out = ${OPPORTUNITY_SOURCES.length}`, a + b === OPPORTUNITY_SOURCES.length)
  check(`month ${m} has something to show`, a > 0)
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
