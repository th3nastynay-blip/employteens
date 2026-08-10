/**
 * EMPLOYTEENS — market geography tests
 *
 *   npx tsx scripts/test-geo.ts
 *
 * Every case in the first two blocks is a real location string pulled from the
 * live jobs table on 2026-08-10, when 337 of 675 active listings turned out to
 * be unreachable for any Hudson County teen.
 */

import { isInMarket, marketTier } from '../lib/jobs/geo'

let failures = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`}`)
}

console.log('— the ones that were live and should never have been —')
check('Rochester Hills MI (no comma before state)', isInMarket('Rochester Hills MI'), false)
check('Buffalo, NY', isInMarket('Buffalo, NY'), false)
check('Albany, NY', isInMarket('Albany, NY'), false)
check('Syracuse, NY', isInMarket('Syracuse, NY'), false)
check('Ithaca NY', isInMarket('Ithaca NY'), false)
check('2102 Montauk Hwy, Bridgehampton,NY 11932-4214', isInMarket('2102 Montauk Hwy, Bridgehampton,NY 11932-4214'), false)
check('2001 South Rd, Poughkeepsie,NY 12601-5978', isInMarket('2001 South Rd, Poughkeepsie,NY 12601-5978'), false)
check('Cherry Hill, NJ (near Philadelphia)', isInMarket('Cherry Hill, NJ'), false)
check('Glassboro, NJ', isInMarket('Glassboro, NJ'), false)
check('Toms River, NJ', isInMarket('Toms River, NJ'), false)
check('New Brunswick NJ (Rutgers Univ)', isInMarket('New Brunswick NJ (Rutgers Univ)'), false)
check('Manhattan Beach, CA', isInMarket('Manhattan Beach, CA'), false)
check('bare "NJ" is not actionable', isInMarket('NJ'), false)
check('empty string', isInMarket(''), false)

console.log('\n— core: Hudson County —')
check('Jersey City', marketTier('Jersey City, NJ'), 'core')
check('Bayonne', marketTier('Bayonne, NJ 07002'), 'core')
check('West New York', marketTier('West New York, NJ'), 'core')
check('100 14th St, Jersey City,NJ 07310-1202', marketTier('100 14th St, Jersey City,NJ 07310-1202'), 'core')
check('Hudson County with no state', marketTier('Belleville, Hudson County'), 'core')

console.log('\n— transit: one ride away —')
check('Brooklyn, NY', marketTier('Brooklyn, NY'), 'transit')
check('New York City, NY', marketTier('New York City, NY'), 'transit')
check('New York City NY (Midtown East)', marketTier('New York City NY (Midtown East)'), 'transit')
check('Williamsburg, NY', marketTier('Williamsburg, NY'), 'transit')
check('Fresh Meadows, NY', marketTier('Fresh Meadows, NY'), 'transit')
check('Newark, NJ', marketTier('Newark, NJ'), 'transit')
check('Montclair, NJ', marketTier('Montclair, NJ'), 'transit')

console.log('\n— extended: longer trip —')
check('Paramus, NJ', marketTier('Paramus, NJ'), 'extended')
check('Hackensack, NJ', marketTier('Hackensack, NJ'), 'extended')
check('Yonkers, NY', marketTier('Yonkers, NY'), 'extended')

console.log('\n— substring traps —')
// Found live on 2026-08-10. Two Target listings in Queensbury NY (200 miles
// north, near Glens Falls) survived a hand-written SQL cleanup because that
// regex had no word boundaries and "queens" matched inside "Queensbury".
// Third instance of this bug class in this codebase, after "ny" matching
// Sunnyvale and "new york" matching West New York. geo.ts uses \b and is
// correct; this test exists so it stays correct.
check('Queensbury NY is not Queens', isInMarket('578 Aviation Rd,Ste 1S Queensbury,NY 12804-1803'), false)
check('Queens Village IS Queens', isInMarket('Queens Village, NY'), true)
check('West New York is Hudson County, not NYC', marketTier('West New York, NJ 07093'), 'core')
check('Newark DE is not Newark NJ', isInMarket('Newark, DE'), false)
check('Bronxville NY is Westchester, not the Bronx', isInMarket('Bronxville, NY'), false)

console.log('\n— traps —')
check('"Middletown, NY" is upstate, not in market', isInMarket('Middletown, NY'), false)
check('"Washington Township, NJ" is far', isInMarket('Washington Township, NJ'), false)
check('Westfield NJ is Union County but 20+ mi', isInMarket('Westfield, NJ'), false)
check('Lake Grove NY is Long Island', isInMarket('Lake Grove, NY'), false)
check('999 Corporate Dr, Westbury,NY 11590', isInMarket('999 Corporate Dr, Westbury,NY 11590-6614'), false)

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} FAILING`}`)
process.exit(failures === 0 ? 0 : 1)
