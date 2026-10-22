import assert from 'node:assert/strict'
import { test } from 'node:test'
import { availabilityRows, planAvailability, SERVICE_AREA_DATA } from './planServiceArea'

// Pick a real plan from the committed map so the test tracks the data.
const SAMPLE = Object.keys(SERVICE_AREA_DATA.plans).find((p) => p.includes('TX'))!

test('planAvailability resolves a plan to its service-area counties', () => {
  const a = planAvailability(SAMPLE)
  assert.ok(a, 'sample plan should resolve')
  assert.equal(a.planId, SAMPLE)
  assert.ok(a.serviceAreaId)
  assert.ok(a.counties.length > 0)
  assert.ok(/^\d{5}$/.test(a.counties[0].fips))
})

test('planAvailability is null for a plan not in the Service Area PUF', () => {
  assert.equal(planAvailability('00000XX0000000'), null)
})

test('availabilityRows emits one row per county', () => {
  const a = planAvailability(SAMPLE)!
  assert.equal(availabilityRows(a).length, a.counties.length)
})
