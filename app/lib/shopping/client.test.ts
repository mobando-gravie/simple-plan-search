import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coerceFetchPlansResponse } from './client'

test('a plain FetchPlansResponse passes through', () => {
  const body = { plans: [{ hiosPlanId: 'A', premiumCents: 100 }], householdSize: 2 }
  assert.deepEqual(coerceFetchPlansResponse(body), body)
})

test('a bare array of plans is accepted', () => {
  const plans = [{ hiosPlanId: 'A', premiumCents: 100 }]
  assert.deepEqual(coerceFetchPlansResponse(plans), { plans })
})

test('a saved HTTP envelope is unwrapped', () => {
  const plans = [{ hiosPlanId: 'A', premiumCents: 100 }]
  assert.deepEqual(coerceFetchPlansResponse({ status: 200, body: { plans } }), {
    plans,
    householdSize: undefined,
  })
})

test('a body with no plans array fails loudly rather than comparing against nothing', () => {
  assert.throws(() => coerceFetchPlansResponse({ interviewId: 7 }), /no `plans` array/)
  assert.throws(() => coerceFetchPlansResponse(null), /no `plans` array/)
  assert.throws(() => coerceFetchPlansResponse('nope'), /no `plans` array/)
})
