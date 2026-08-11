/**
 * EMPLOYTEENS — opportunity seed contract tests
 *
 *   npx tsx scripts/test-opportunity-sources.ts
 *
 * The seed was cleared on 2026-08-10 pending a hand-picked list. These no
 * longer test 42 specific rows; they test the CONTRACT, so the moment an entry
 * is added it has to satisfy every rule in the file header or the build fails.
 *
 * Each failure here is a row that would either be rejected by the database
 * CHECK constraint or, worse, shown to a teen it does not apply to.
 */

import { OPPORTUNITY_SOURCES } from '../lib/jobs/opportunity-sources'

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  \u2014 ${detail}`}`)
}

console.log(`\u2014 ${OPPORTUNITY_SOURCES.length} entries \u2014\n`)

if (OPPORTUNITY_SOURCES.length === 0) {
  console.log('Seed is empty (awaiting the curated list). Contract checks will')
  console.log('run automatically as soon as entries are added.\n')
}

const slugs = new Set<string>()
const urls = new Set<string>()

for (const o of OPPORTUNITY_SOURCES) {
  // Required by the database CHECK constraint on non-job rows.
  check(`${o.slug}: declares delivery, regions and grade range`,
    !!o.delivery && Array.isArray(o.eligible_regions) && o.eligible_regions.length > 0 &&
    typeof o.min_grade === 'number' && typeof o.max_grade === 'number')

  check(`${o.slug}: grades ${o.min_grade}-${o.max_grade} are sane`,
    o.min_grade >= 6 && o.max_grade <= 12 && o.min_grade <= o.max_grade)

  check(`${o.slug}: rungs ${o.rung_from}-${o.rung_to} are sane`,
    o.rung_from >= 0 && o.rung_to <= 7 && o.rung_from <= o.rung_to)

  // Rule 1: no invented deadlines. A bare year in the prose means someone
  // pasted this year's date into a field meant to hold a recurring pattern.
  check(`${o.slug}: windowNote holds a pattern, not a year`,
    o.windowNote.length > 10 && !/\b20\d{2}\b/.test(o.windowNote), o.windowNote)

  // A hard date is allowed, but only with proof of where and when we read it.
  if (o.deadline) {
    check(`${o.slug}: deadline carries verifiedOn and a source`,
      !!o.deadline.verifiedOn && /^https:\/\//.test(o.deadline.source))
  }

  // Rule 4: a reference requires a human who would take the call.
  if (o.evidence_kind === 'reference') {
    check(`${o.slug}: claims a reference and has a supervisor`, o.supervised === true,
      'no supervisor \u2014 should be hours or certificate')
  }
  if (o.delivery === 'virtual' && o.recurrence === 'rolling' && !o.supervised) {
    check(`${o.slug}: unsupervised self-paced does not claim a reference`,
      o.evidence_kind !== 'reference', `claims ${o.evidence_kind}`)
  }

  // Rule 5: links are read, not remembered.
  check(`${o.slug}: url is https`, o.apply_url.startsWith('https://'), o.apply_url)
  check(`${o.slug}: slug is unique`, !slugs.has(o.slug))
  check(`${o.slug}: url is unique`, !urls.has(o.apply_url))
  slugs.add(o.slug)
  urls.add(o.apply_url)

  check(`${o.slug}: has a real description`, o.description.trim().length >= 60)
}

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
