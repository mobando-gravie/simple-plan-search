import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseApiQuery, type ApiQuery } from './query'

function ok(search: string): ApiQuery {
  const parsed = parseApiQuery(new URLSearchParams(search))
  assert.ok(!('error' in parsed), `expected a query, got ${JSON.stringify(parsed)}`)
  return parsed.query
}

function err(search: string) {
  const parsed = parseApiQuery(new URLSearchParams(search))
  assert.ok('error' in parsed, 'expected a failure')
  return parsed
}

test('zip is required and must be five digits', () => {
  assert.match(err('age=40').error, /zip is required/)
  assert.match(err('zip=112').error, /zip is required/)
  assert.equal(ok('zip=11201').criteria.zipCode, '11201')
})

test('the household defaults to one 35-year-old and grows from long names', () => {
  assert.deepEqual(ok('zip=11201').criteria.household, {
    member: { age: 35, tobacco: false },
    spouse: null,
    children: [],
  })

  const family = ok('zip=11201&age=40&member_tobacco=true&spouse_age=38&child_ages=10,8')
  assert.deepEqual(family.criteria.household, {
    member: { age: 40, tobacco: true },
    spouse: { age: 38, tobacco: false },
    children: [{ age: 10 }, { age: 8 }],
  })
})

test('member_age is an accepted alias, and a bare flag reads as true', () => {
  const query = ok('zip=11201&member_age=52&member_tobacco')
  assert.deepEqual(query.criteria.household.member, { age: 52, tobacco: true })
})

test('the UI short keys still work, so a browser URL runs verbatim', () => {
  const query = ok('z=75201&a=40t.38&k=10.8&i=80000&w=400&f=s.g&mp=800&o=ff')
  assert.equal(query.criteria.zipCode, '75201')
  assert.deepEqual(query.criteria.household.member, { age: 40, tobacco: true })
  assert.deepEqual(query.criteria.household.spouse, { age: 38, tobacco: false })
  assert.equal(query.criteria.householdIncome, 80000)
  assert.equal(query.criteria.allowanceCents, 40000)
  assert.deepEqual(query.filters.metalLevels, ['silver', 'gold'])
  assert.equal(query.filters.maxPremiumCents, 80000)
  assert.equal(query.filters.sort, 'free-floor')
})

test('a long name wins over the short key it replaces', () => {
  assert.equal(ok('zip=11201&z=75201').criteria.zipCode, '11201')
})

test('metals and sort accept full names as well as short codes', () => {
  assert.deepEqual(ok('zip=11201&metals=silver,gold').filters.metalLevels, ['silver', 'gold'])
  assert.deepEqual(ok('zip=11201&metals=s,g').filters.metalLevels, ['silver', 'gold'])
  assert.equal(ok('zip=11201&sort=deductible-desc').filters.sort, 'deductible-desc')
  assert.equal(ok('zip=11201&sort=dd').filters.sort, 'deductible-desc')
})

test('an unknown metal level or sort is an error, not an empty result set', () => {
  assert.match(err('zip=11201&metals=platnium').error, /Unknown metal level "platnium"/)
  assert.match(err('zip=11201&metals=silver,gld').hint, /bronze, expanded_bronze/)
  assert.match(err('zip=11201&sort=cheapest').error, /Unknown sort "cheapest"/)
  assert.match(err('zip=11201&sort=cheapest').hint, /free-floor/)
})

test('a missing zip is reported before a bad filter value', () => {
  assert.match(err('sort=cheapest').error, /zip is required/)
})

test('providers and drugs split on commas', () => {
  const query = ok('zip=11201&providers=1164996864,1234567893&drugs=158585_42385-0943-01,r83367')
  assert.deepEqual(
    query.criteria.providers.map((p) => p.npi),
    [1164996864, 1234567893],
  )
  assert.deepEqual(
    query.criteria.drugs.map((d) => [d.medId, d.ndc, d.rxcui ?? null]),
    [
      [158585, '42385-0943-01', null],
      [0, null, 83367],
    ],
  )
})

test('carriers repeat rather than joining, because names contain dots', () => {
  assert.deepEqual(ok('zip=11201&carriers=Oscar&carriers=U.S. Health').filters.carriers, [
    'Oscar',
    'U.S. Health',
  ])
})

test('coverage filters take all / any, and anything else is an error', () => {
  assert.equal(ok('zip=11201&provider_coverage=all').filters.providerCoverage, 'match')
  assert.equal(ok('zip=11201&drug_coverage=any').filters.drugCoverage, 'partial')
  assert.match(err('zip=11201&drug_coverage=some').error, /must be "all" or "any"/)
})

test('hsa_only=false clears the short key it maps onto', () => {
  assert.equal(ok('zip=11201&hsa_only=true').filters.hsaOnly, true)
  assert.equal(ok('zip=11201&hsa=1&hsa_only=false').filters.hsaOnly, false)
})

test('limit is bounded, and never shrinks the search itself', () => {
  assert.equal(ok('zip=11201').limit, 200)
  assert.equal(ok('zip=11201&limit=10').limit, 10)
  // perPage stays at the default so limit=5 and limit=50 share one cache entry.
  assert.equal(ok('zip=11201&limit=10').criteria.perPage, 200)
  assert.match(err('zip=11201&limit=0').error, /limit must be/)
  assert.match(err('zip=11201&limit=201').error, /limit must be/)
  assert.match(err('zip=11201&limit=ten').error, /limit must be/)
})

test('view defaults to summary and rejects anything else', () => {
  assert.equal(ok('zip=11201').view, 'summary')
  assert.equal(ok('zip=11201&view=FULL').view, 'full')
  assert.match(err('zip=11201&view=brief').error, /view must be/)
})

test('market defaults to individual and rejects anything unknown', () => {
  assert.equal(ok('zip=11201').criteria.market, 'individual')
  assert.equal(ok('zip=11201&market=small_group').criteria.market, 'small_group')
  assert.match(err('zip=11201&market=group').error, /Unknown market "group"/)
})

test('refresh is off unless asked for', () => {
  assert.equal(ok('zip=11201').refresh, false)
  assert.equal(ok('zip=11201&refresh=true').refresh, true)
  assert.equal(ok('zip=11201&refresh').refresh, true)
})
