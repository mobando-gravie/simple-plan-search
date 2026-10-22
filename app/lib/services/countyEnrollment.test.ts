import assert from 'node:assert/strict'
import { test } from 'node:test'
import { countyLandscape, countyRows } from './countyEnrollment'

test('countyLandscape resolves a county with issuers, demographics and a name', () => {
  const c = countyLandscape('48201') // Harris County, TX
  assert.ok(c, '48201 should be covered')
  assert.equal(c.state, 'TX')
  assert.equal(c.countyName, 'Harris')
  assert.ok(c.total > 0)
  assert.ok(c.issuers.length > 0)
  assert.ok(c.demographics.female >= 0 && 'smoker' in c.demographics)
  // Issuers are ranked descending.
  assert.ok(c.issuers[0].enrollment >= c.issuers[c.issuers.length - 1].enrollment)
})

test('countyLandscape is null for an uncovered county', () => {
  assert.equal(countyLandscape('99999'), null)
})

test('countyRows emits one row per issuer', () => {
  const c = countyLandscape('48201')!
  assert.equal(countyRows(c).length, c.issuers.length)
})
