import assert from 'node:assert/strict'
import { test } from 'node:test'
import { areaRateRows, areaRates, isFfmState } from './areaRates'

test('areaRates returns the curves for an FFM area', () => {
  const r = areaRates('TX01')
  assert.ok(r, 'TX01 should have rate data')
  assert.equal(r.state, 'TX')
  assert.ok(r.years.length > 0)
  assert.deepEqual(r.referenceAges, [21, 30, 40, 50, 60, 64])

  const latest = r.years.at(-1)!
  assert.ok(latest.cheapestCents['64'] > 0, 'top age bucket is present')
  // The benchmark (2nd-lowest silver) is never below the cheapest plan at the same age.
  assert.ok(latest.benchmarkSilverCents['40'] >= latest.cheapestCents['40'])
})

test('areaRates is null for a state-based-exchange area not in the Rate PUF', () => {
  assert.equal(areaRates('MN07'), null)
})

test('isFfmState reflects Rate PUF coverage', () => {
  assert.equal(isFfmState('tx'), true)
  assert.equal(isFfmState('MN'), false)
})

test('areaRateRows emits one row per year × reference age', () => {
  const r = areaRates('TX01')!
  const rows = areaRateRows(r)
  assert.equal(rows.length, r.years.length * r.referenceAges.length)
  assert.deepEqual(rows[0].slice(0, 3), ['TX01', r.years[0].year, 21])
})
