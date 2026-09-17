/**
 * EMPLOYTEENS — opportunity location tests
 *
 *   npx tsx scripts/test-opportunity-location.ts
 *
 * THE BUG THIS LOCKS DOWN.
 *
 * toJobRow derived a town from an eligibility region:
 *
 *   location: local === 'US-NY' ? 'New York, NY' : 'Jersey City, NJ'
 *
 * so every in-person opportunity that was not tagged US-NY was written to the
 * database as being in Jersey City. On the live feed that produced, in the top
 * ten of Best Matches, a University of Waterloo contest (Ontario, CANADA)
 * labelled "Jersey City, NJ", a Rutgers programme in Camden labelled "Jersey
 * City, NJ" directly beneath its own "South Jersey" and "Long trip" tags, and
 * Greater Newark Conservancy, North Bergen's library, the Lyndhurst
 * Meadowlands institute and Hackensack Riverkeeper all relocated to Jersey
 * City. Every one of those was a fact we invented and showed to a teen.
 *
 * The first block below is the one that matters: no in-person entry outside
 * Jersey City may ever again report Jersey City.
 */

import { OPPORTUNITY_SOURCES } from '../lib/jobs/opportunity-sources'
import { toJobRow } from '../lib/jobs/opportunity-ingest'
import { displayLocation } from '../lib/jobs/opportunity-location'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : `  ${detail}`}`)
}

const bySlug = (slug: string) => {
  const o = OPPORTUNITY_SOURCES.find((x) => x.slug === slug)
  if (!o) throw new Error(`no such slug: ${slug}`)
  return o
}
const rowFor = (slug: string) => toJobRow(bySlug(slug), 9)

console.log('— THE BUG: everything used to claim Jersey City —')
check('Waterloo CEMC is in Ontario, not Jersey City', rowFor('waterloo-cemc').location, 'Waterloo, ON, Canada')
check('Rutgers RUSE is in Camden', rowFor('rutgers-ruse-camden').location, 'Camden, NJ')
check('Greater Newark Conservancy is in Newark', rowFor('greater-newark-volunteer').location, 'Newark, NJ')
check('North Bergen library is in North Bergen', rowFor('nbpl-teen-volunteer').location, 'North Bergen, NJ')
check('Meadowlands RRI is in Lyndhurst', rowFor('meadowlands-monitoring').location, 'Lyndhurst, NJ')
check('Hackensack Riverkeeper is in Hackensack', rowFor('hackensack-riverkeeper-cleanups').location, 'Hackensack, NJ')

console.log('\n— no in-person entry may claim Jersey City unless it IS there —')
for (const o of OPPORTUNITY_SOURCES) {
  if (o.delivery === 'virtual') continue
  const loc = toJobRow(o, 9).location
  const claimsJC = /jersey city/i.test(String(loc))
  const reallyJC = /jersey city/i.test(String(o.city ?? ''))
  ok(`${o.slug} → "${loc}"`, !claimsJC || reallyJC, `claims Jersey City but city is "${o.city ?? '(unset)'}"`)
}

console.log('\n— virtual entries keep the no-commute sentinel —')
for (const o of OPPORTUNITY_SOURCES) {
  if (o.delivery !== 'virtual') continue
  const row = toJobRow(o, 9)
  ok(`${o.slug} location`, row.location === 'Virtual', `got "${row.location}"`)
  ok(`${o.slug} zip`, row.zip_code === '00000', `got "${row.zip_code}"`)
}

console.log('\n— every in-person entry declares a city (rule 6) —')
for (const o of OPPORTUNITY_SOURCES) {
  if (o.delivery === 'virtual') continue
  ok(`${o.slug} has city`, typeof o.city === 'string' && o.city.length > 0, '(missing `city`)')
}

console.log('\n— an in-person entry with no city refuses to guess one —')
const noCity = { ...bySlug('greater-newark-volunteer'), city: undefined, zip: undefined }
check('location', toJobRow(noCity, 9).location, 'Location not stated')
check('zip falls back to the no-distance sentinel', toJobRow(noCity, 9).zip_code, '00000')

console.log('\n— displayLocation corrects rows already written to the database —')
// This is what the live table holds right now: the fabricated town.
const staleRow = {
  location: 'Jersey City, NJ',
  apply_url: bySlug('waterloo-cemc').apply_url,
  source: 'opportunity',
}
check('stale Waterloo row renders as Ontario', displayLocation(staleRow), 'Waterloo, ON, Canada')
check('stale Rutgers row renders as Camden', displayLocation({ ...staleRow, apply_url: bySlug('rutgers-ruse-camden').apply_url }), 'Camden, NJ')

console.log('\n— employer job rows are NOT rewritten —')
check(
  'a Greenhouse posting keeps the employer\'s own location',
  displayLocation({ location: 'Hoboken, NJ', apply_url: 'https://boards.greenhouse.io/acme/jobs/123456', source: 'greenhouse' }),
  'Hoboken, NJ',
)
check(
  'a row with no location and no match says so rather than guessing',
  displayLocation({ location: null, apply_url: 'https://example.com/jobs/9', source: 'adzuna' }),
  'Location not stated',
)

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`)
process.exit(failures === 0 ? 0 : 1)
