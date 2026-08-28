import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapPlan } from './mapPlan'
import type { IdeonPlan } from './types'

/** Shape taken from a live TX response (age-rated: real per-person figures). */
const AGE_RATED: IdeonPlan = {
  id: '47501TX0040004',
  premium: 1210.95,
  premiums_by_applicant: [
    { age: 40, child: false, premium: 433.14, composite_rated: false, waived_for_total: false },
    { age: 10, child: true, premium: 259.27, composite_rated: false, waived_for_total: false },
    { age: 8, child: true, premium: 259.27, composite_rated: false, waived_for_total: false },
    { age: 6, child: true, premium: 259.27, composite_rated: false, waived_for_total: false },
    { age: 4, child: true, premium: 259.27, composite_rated: false, waived_for_total: true },
  ],
}

/** Shape taken from a live NY response (composite rated: every premium null). */
const COMPOSITE: IdeonPlan = {
  id: '25303NY0610001',
  premium: 1844.78,
  premiums_by_applicant: [
    { age: 40, child: false, premium: null, composite_rated: true, waived_for_total: false },
    { age: 8, child: true, premium: null, composite_rated: true, waived_for_total: false },
  ],
}

test('per-applicant premiums map to cents in order', () => {
  const mapped = mapPlan(AGE_RATED)
  assert.equal(mapped.applicantPremiums.length, 5)
  assert.deepEqual(mapped.applicantPremiums[0], {
    age: 40,
    child: false,
    premiumCents: 43314,
    waived: false,
  })
  assert.deepEqual(
    mapped.applicantPremiums.map((a) => a.premiumCents),
    [43314, 25927, 25927, 25927, 25927],
  )
})

test('the ACA-capped child is flagged waived even though it carries a rate', () => {
  const mapped = mapPlan(AGE_RATED)
  assert.deepEqual(
    mapped.applicantPremiums.map((a) => a.waived),
    [false, false, false, false, true],
  )
  // The waived child still reports a rate; the total simply excludes it.
  assert.equal(mapped.applicantPremiums[4].premiumCents, 25927)
})

test('an age-rated plan is not composite rated', () => {
  assert.equal(mapPlan(AGE_RATED).compositeRated, false)
})

test('a plan whose applicants all lack a premium is composite rated', () => {
  const mapped = mapPlan(COMPOSITE)
  assert.equal(mapped.compositeRated, true)
  assert.deepEqual(
    mapped.applicantPremiums.map((a) => a.premiumCents),
    [null, null],
  )
})

test('a plan with no applicant breakdown is not reported as composite rated', () => {
  // Empty means "Ideon told us nothing", which is different from "priced by tier".
  const mapped = mapPlan({ id: 'X', premium: 100 })
  assert.deepEqual(mapped.applicantPremiums, [])
  assert.equal(mapped.compositeRated, false)
})

test('a partially-priced breakdown is not composite rated', () => {
  const mixed = mapPlan({
    id: 'X',
    premium: 100,
    premiums_by_applicant: [
      { age: 40, child: false, premium: 60, waived_for_total: false },
      { age: 8, child: true, premium: null, waived_for_total: false },
    ],
  })
  assert.equal(mixed.compositeRated, false)
})
