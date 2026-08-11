/**
 * EMPLOYTEENS — opportunity ingest mapping tests
 *
 *   npx tsx scripts/test-opportunity-ingest.ts
 *
 * Pure mapping and seasonality logic. No database, no network.
 */

import { logoForUrl, inSeason, toJobRow } from '../lib/jobs/opportunity-ingest'
import { OPPORTUNITY_SOURCES } from '../lib/jobs/opportunity-sources'

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  — ${detail}`}`)
}

console.log('— logos derive from the apply URL, no files —')
check('https url yields a favicon url', (logoForUrl('https://hosa.org/competitive-events/') ?? '').includes('hosa.org'))
check('subdomain preserved', (logoForUrl('https://cs50.harvard.edu/x/') ?? '').includes('cs50.harvard.edu'))
check('garbage url returns null rather than a broken image', logoForUrl('not a url') === null)
check('every seed entry resolves a logo', OPPORTUNITY_SOURCES.every((o) => logoForUrl(o.apply_url) !== null))

if (OPPORTUNITY_SOURCES.length === 0) {
  // Seed cleared 2026-08-10 pending the curated list. The pure helpers above
  // still run; everything below needs real entries to assert against.
  console.log('\nSeed is empty — mapping checks will run once entries are added.')
  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
  process.exit(failures === 0 ? 0 : 1)
}

console.log('\n— seasonality —')
const seasonal = OPPORTUNITY_SOURCES.find((o) => o.activeMonths && o.activeMonths.length > 0)!
const yearRound = OPPORTUNITY_SOURCES.find((o) => !o.activeMonths || o.activeMonths.length === 0)!
check('year-round entry is in season in every month', [1, 5, 8, 12].every((m) => inSeason(yearRound, m)))
check('seasonal entry is out of season somewhere', [1,2,3,4,5,6,7,8,9,10,11,12].some((m) => !inSeason(seasonal, m)))

console.log('\n— row mapping —')
const virtual = OPPORTUNITY_SOURCES.find((o) => o.delivery === 'virtual')!
const vrow = toJobRow(virtual, 8)
check('virtual entries are located "Virtual", not a town', vrow.location === 'Virtual', vrow.location)
check('virtual entries have zero commute', vrow.commute_estimate === 0)
check('virtual entries get max schedule flexibility', vrow.schedule_flexibility_score === 100)

const local = OPPORTUNITY_SOURCES.find((o) => o.delivery === 'in_person' && o.eligible_regions.includes('US-NJ'))!
const lrow = toJobRow(local, 8)
check('NJ in-person entries land in Jersey City', String(lrow.location).includes('Jersey City'), String(lrow.location))
check('NJ in-person entries carry a real ZIP', lrow.zip_code !== '00000')

console.log('\n— cost honesty survives the mapping —')
const freeOne = OPPORTUNITY_SOURCES.find((o) => o.cost_cents === null)!
const unknownCost = OPPORTUNITY_SOURCES.find((o) => o.cost_cents === undefined)!
check('free stays free, not unknown', toJobRow(freeOne, 8).cost_unknown === false)
check('unconfirmed cost is flagged unknown, never guessed as free', toJobRow(unknownCost, 8).cost_unknown === true)

console.log('\n— age filters do not hide opportunities from younger teens —')
for (const o of OPPORTUNITY_SOURCES) {
  const row = toJobRow(o, 8)
  check(
    `${o.slug}: grade ${o.min_grade} → min_age ${row.min_age}`,
    (row.min_age as number) <= 19 && (row.min_age as number) >= 13,
    `min_age ${row.min_age}`,
  )
}

console.log('\n— every entry maps without throwing —')
let mapped = 0
for (const o of OPPORTUNITY_SOURCES) {
  const row = toJobRow(o, 8)
  if (row.title && row.company && row.apply_url && row.kind) mapped++
}
check(`${mapped} of ${OPPORTUNITY_SOURCES.length} map cleanly`, mapped === OPPORTUNITY_SOURCES.length)

const augustLive = OPPORTUNITY_SOURCES.filter((o) => inSeason(o, 8)).length
const januaryLive = OPPORTUNITY_SOURCES.filter((o) => inSeason(o, 1)).length
console.log(`\n  August: ${augustLive} live · January: ${januaryLive} live · seed ${OPPORTUNITY_SOURCES.length}`)
check('something is live in every month', [1,2,3,4,5,6,7,8,9,10,11,12].every((m) => OPPORTUNITY_SOURCES.some((o) => inSeason(o, m))))

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
