/**
 * EMPLOYTEENS — min_age resolution tests
 *
 *   npx tsx scripts/test-min-age.ts
 *
 * The case that matters most is the first block: a posting whose description
 * says "must be 18" must never resolve to 16, because that is how a teen gets
 * sent to an application they are legally ineligible for.
 */

import { resolveMinAgeDetailed, statedMinAge, adultAgeFloor } from '../lib/jobs/teen-scoring'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}
const age = (t: string, c: string, d?: string, decl?: number) =>
  resolveMinAgeDetailed(t, c, d, decl).min_age

console.log('— THE BUG: 18+ text used to resolve to 16 —')
check('"Must be 18 years of age or older"', age('Team Member', 'Joe\'s Grill', 'Must be 18 years of age or older.'), 18)
check('"must be at least 18"', age('Crew', 'Random LLC', 'Applicants must be at least 18 to apply.'), 18)
check('"Minimum age: 18"', age('Cashier', 'Random LLC', 'Minimum age: 18. Weekends required.'), 18)
check('"18+ only"', age('Stocker', 'Random LLC', 'Night shift, 18+ only.'), 18)
check('"21 years or older" → excluded from platform', age('Server', 'Random LLC', 'Must be 21 years or older.'), 21)
check('known brand cannot override stated age', age('Crew Member', 'McDonald\'s', 'You must be 18 to work at this location.'), 18)

console.log('\n— stated age can LOWER too —')
check('franchise stating 15 unlocks 15-year-olds', age('Crew Member', 'Subway', 'We hire at 15 with working papers.'), 15)
check('"at least 14 years"', age('Team Member', 'Local Deli', 'Must be at least 14 years old.'), 14)

console.log('\n— false positives —')
check('"must be 100% available" is not an age', statedMinAge('You must be 100% available weekends.'), null)
check('"must be able to lift 50 lbs" is not an age', statedMinAge('Must be able to lift 50 lbs.'), null)
check('"must be 25 lbs" guarded', statedMinAge('Package must be 25 lbs or less.'), null)
check('no age text → null', statedMinAge('Fun team, flexible hours, free food.'), null)

console.log('\n— legal floors, now on every source (was Workday-only) —')
check('alcohol service', age('Team Member', 'Random LLC', 'Serving beer and wine to guests.'), 18)
check('driver license required', age('Crew', 'Random LLC', 'Valid driver\'s license required.'), 18)
check('forklift', age('Warehouse Associate', 'Random LLC', 'Forklift certification a plus.'), 18)
check('overnight shift', age('Stocker', 'Random LLC', 'Overnight shift, 11pm start.'), 18)
check('floor beats a lower stated age', age('Crew', 'Random LLC', 'Must be 16. Overnight shift available.'), 18)
check('floor beats a trusted declared age', age('Stocker', 'Wegmans', 'Overnight replenishment.', 15), 18)
check('adultAgeFloor names the reason', adultAgeFloor('Valid driver\'s license required.')?.why, 'driving required')

console.log('\n— unchanged behaviour —')
check('unrecognized employer still defaults to 16', age('Team Member', 'Some Random Cafe'), 16)
check('AMC still 14', age('Crew Member', 'AMC Theatres'), 14)
check('usher title still 14', age('Usher', 'Unknown Cinema Co'), 14)
check('declared age used when nothing stated', age('Cashier', 'Unknown Co', 'Great team!', 15), 15)

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
