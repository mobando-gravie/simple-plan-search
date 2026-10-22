import assert from 'node:assert/strict'
import { test } from 'node:test'
import { enrollmentOverview, enrollmentRows, issuerRows, metalMixRows, stateEnrollment } from './enrollment'

test('stateEnrollment returns a state year with totals, metal mix and rankings', () => {
  const e = stateEnrollment('TX')
  assert.ok(e, 'TX should have enrollment')
  assert.equal(e.state, 'TX')
  assert.ok(e.total > 0)
  assert.ok(e.metalMix['Silver'] > 0)
  assert.ok(e.topPlans.length > 0 && e.topPlans.length <= 25)
  assert.ok(e.topIssuers.length > 0 && e.topIssuers.length <= 15)
  // Top plans and issuers are ranked descending.
  assert.ok(e.topPlans[0].enrollment >= e.topPlans[e.topPlans.length - 1].enrollment)
})

test('stateEnrollment honors an explicit year and defaults to the latest', () => {
  assert.equal(stateEnrollment('TX', 2023)?.year, 2023)
  const latest = stateEnrollment('TX')!.year
  assert.ok(latest >= 2023)
})

test('stateEnrollment is null for an unknown state', () => {
  assert.equal(stateEnrollment('ZZ'), null)
})

test('enrollmentOverview ranks states by latest total and includes TX', () => {
  const ov = enrollmentOverview()
  const tx = ov.states.find((s) => s.state === 'TX')
  assert.ok(tx && tx.latestTotal > 0)
  assert.ok(ov.states[0].latestTotal >= ov.states[ov.states.length - 1].latestTotal)
})

test('enrollmentRows emits one row per top plan', () => {
  const e = stateEnrollment('TX')!
  assert.equal(enrollmentRows(e).length, e.topPlans.length)
})

test('metalMixRows and issuerRows emit one row each with a share percent', () => {
  const e = stateEnrollment('TX')!
  const metal = metalMixRows(e)
  assert.equal(metal.length, Object.keys(e.metalMix).length)
  // [state, year, metal, enrollment, share_pct] — highest first, share 0–100.
  assert.equal(metal[0][0], 'TX')
  assert.ok(Number(metal[0][4]) >= 0 && Number(metal[0][4]) <= 100)
  assert.equal(issuerRows(e).length, e.topIssuers.length)
})
