/**
 * EMPLOYTEENS — Child labor rule tests
 *
 *   npx tsx scripts/test-child-labor.ts
 *
 * The first block is the one that matters commercially: NJ legally permits
 * 14-year-olds in restaurants, supermarkets, retail, hotels, libraries and
 * camps, and the old resolver hid all of it behind a default of 16.
 */

import {
  resolveLegalMinAge,
  detectHoursConflicts,
  resolveEffectiveMinAge,
  stateFromLocation,
  HOURS_RULES,
} from '../lib/jobs/child-labor'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}
const legal = (t: string, d?: string) => resolveLegalMinAge(t, d).legal_min_age

console.log('— NJ permits these at 14, we were hiding them —')
check('Busser', legal('Busser'), 14)
check('Dishwasher', legal('Dishwasher'), 14)
check('Grocery Bagger', legal('Grocery Bagger'), 14)
check('Cashier', legal('Cashier'), 14)
check('Retail Sales Associate', legal('Retail Sales Associate'), 14)
check('Ice Cream Scooper', legal('Ice Cream Scooper'), 14)
check('Library Page', legal('Library Page'), 14)
check('Camp Counselor', legal('Camp Counselor'), 14)
check('Lifeguard', legal('Lifeguard'), 14)
check('Movie Theater Usher', legal('Movie Theater Usher'), 14)
check('Hotel Front Desk', legal('Hotel Front Desk Associate'), 14)
check('Office Assistant', legal('Office Assistant'), 14)
check('Peer Tutor', legal('Peer Tutor'), 14)

console.log('\n— 16+ restrictions, not 18 (previous version was too strict) —')
check('Landscaping', legal('Landscaping Crew'), 16)
check('Warehouse Associate', legal('Warehouse Associate'), 16)
check('Mechanic', legal('Lube Technician'), 16)
check('Deli Clerk', legal('Deli Counter Clerk'), 16)
check('Factory', legal('Production Line Associate'), 16)

console.log('\n— hard blocks at 18 —')
check('Bartender', legal('Bartender'), 18)
check('Forklift', legal('Warehouse Forklift Operator'), 18)
check('Construction', legal('Construction Laborer'), 18)
check('Meat slicer in description', legal('Team Member', 'Operates the meat slicer daily.'), 18)
check('Driver license required', legal('Courier', 'Valid driver\'s license required.'), 18)
check('Scrap yard', legal('Scrap Metal Yard Helper'), 18)

console.log('\n— unmatched still defaults to 16 —')
check('Unknown role', legal('Widget Coordinator'), 16)

console.log('\n— hours conflicts, NJ school year —')
check(
  '"until 11pm" blocks 14 to 15 only in NJ',
  detectHoursConflicts('Evening shifts until 11pm.', 'NJ', true).impliedMinAge,
  16,
)
check(
  '"until 6pm" blocks nobody',
  detectHoursConflicts('Shifts until 6pm.', 'NJ', true).impliedMinAge,
  null,
)
check(
  'overnight blocks everyone under 18',
  detectHoursConflicts('Overnight stocking shift.', 'NJ', true).impliedMinAge,
  18,
)
check(
  '30 hours a week exceeds the 14 to 15 cap of 18',
  detectHoursConflicts('Roughly 30 hours per week.', 'NJ', true).impliedMinAge,
  16,
)

console.log('\n— NY is stricter for 16 to 17 during the school year —')
check('NY 16-17 weekly cap is 28', HOURS_RULES.NY['16_17'].schoolWeek.maxWeekHours, 28)
check('NJ 16-17 weekly cap is 40', HOURS_RULES.NJ['16_17'].schoolWeek.maxWeekHours, 40)
check(
  '35 hrs/week is legal for 16 to 17 in NJ',
  detectHoursConflicts('35 hours per week.', 'NJ', true).impliedMinAge,
  16,
)
check(
  '35 hrs/week is NOT legal for 16 to 17 in NY',
  detectHoursConflicts('35 hours per week.', 'NY', true).impliedMinAge,
  18,
)
check(
  'NY 11pm exceeds the 10pm cap for 16 to 17',
  detectHoursConflicts('Shifts until 11pm.', 'NY', true).impliedMinAge,
  18,
)

console.log('\n— state inference —')
check('Jersey City is NJ', stateFromLocation('Jersey City, NJ'), 'NJ')
check('Brooklyn is NY', stateFromLocation('Brooklyn, NY'), 'NY')
check('Astoria is NY', stateFromLocation('Astoria, Queens'), 'NY')
check('West New York is NJ, not NY', stateFromLocation('West New York, New Jersey'), 'NJ')

console.log('\n— effective age combines law, hours, and employer policy —')
check(
  'legal 14 but employer says 16',
  resolveEffectiveMinAge({ title: 'Cashier', location: 'Bayonne, NJ', employerMinAge: 16 }).effective_min_age,
  16,
)
check(
  'legal stays 14 in the separate field',
  resolveEffectiveMinAge({ title: 'Cashier', location: 'Bayonne, NJ', employerMinAge: 16 }).legal_min_age,
  14,
)
check(
  'employer cannot go below the law',
  resolveEffectiveMinAge({ title: 'Bartender', location: 'Hoboken, NJ', employerMinAge: 16 }).effective_min_age,
  18,
)
check(
  'hours push a legal-14 job to 16',
  resolveEffectiveMinAge({ title: 'Busser', description: 'Shifts until 10pm.', location: 'Jersey City, NJ' }).effective_min_age,
  16,
)

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
