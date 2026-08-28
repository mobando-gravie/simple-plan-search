import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Household } from '../household'
import { coerceHotwireResponse, hotwirePayload } from './hotwire'

const SOLO: Household = { member: { age: 40, tobacco: false }, spouse: null, children: [] }

const FAMILY: Household = {
  member: { age: 40, tobacco: true },
  spouse: { age: 38, tobacco: false },
  children: [{ age: 10 }, { age: 8 }],
}

const BASE = { zipCode: '75201', fipsCode: '48113', coverageDate: '2026-10-01' }

test('a solo household sends no spouse and no children', () => {
  const payload = hotwirePayload({ ...BASE, household: SOLO })
  assert.equal(payload.applicantAge, 40)
  assert.equal(payload.applicantTobaccoUser, false)
  assert.equal(payload.spouse, null)
  assert.deepEqual(payload.children, [])
})

test('spouse and children render positionally, with per-adult tobacco', () => {
  const payload = hotwirePayload({ ...BASE, household: FAMILY })
  assert.equal(payload.applicantTobaccoUser, true)
  assert.deepEqual(payload.spouse, { age: 38, tobaccoUser: false })
  assert.deepEqual(payload.children, [
    { age: 10, tobaccoUser: false },
    { age: 8, tobaccoUser: false },
  ])
})

test('one coverage date fills both date fields, in their different formats', () => {
  // requestedCoverageDate anchors the catalog query; effectiveDate gates the rate
  // back-fill. Omitting the second returns every plan at premiumCents 0.
  const payload = hotwirePayload({ ...BASE, household: SOLO }) as Record<string, never>
  assert.equal((payload.planSearch as Record<string, string>).requestedCoverageDate, '2026-10-01')
  assert.equal(payload.effectiveDate as unknown as string, '2026-10-01T00:00:00Z')
})

test('zip and FIPS both travel — hotwire will not derive one from the other', () => {
  const planSearch = hotwirePayload({ ...BASE, household: SOLO }).planSearch as Record<string, string>
  assert.equal(planSearch.memberZipCode, '75201')
  assert.equal(planSearch.memberCountyFipsCode, '48113')
})

test('the allowance defaults to zero and is echoed when supplied', () => {
  const intakeOf = (p: Record<string, unknown>) => p.intake as Record<string, unknown>
  assert.equal(intakeOf(hotwirePayload({ ...BASE, household: SOLO })).ichraAllowanceCents, 0)
  assert.equal(
    intakeOf(hotwirePayload({ ...BASE, household: SOLO, allowanceCents: 45000 }))
      .ichraAllowanceCents,
    45000,
  )
})

test('nested ranked plans are flattened to the comparator shape', () => {
  const result = coerceHotwireResponse({
    employerContributionCents: 45000,
    householdSize: 4,
    recommendedPlans: [
      { rank: 1, plan: { hiosPlanId: '20069TX0100060', premiumCents: 183718, metalLevel: 'Silver' } },
      { rank: 2, plan: { hiosPlanId: '20069TX0100061', premiumCents: 190000, metalLevel: 'Gold' } },
    ],
  })
  assert.equal(result.response.plans.length, 2)
  assert.equal(result.response.plans[0].hiosPlanId, '20069TX0100060')
  assert.equal(result.response.plans[0].premiumCents, 183718)
  assert.equal(result.employerContributionCents, 45000)
  assert.equal(result.householdSize, 4)
})

test('unpriceable plans are dropped and counted, not compared as zero', () => {
  // Shopping ships plans it could not price at premiumCents 0 rather than
  // dropping them; left in, each reads as a several-hundred-dollar delta.
  const result = coerceHotwireResponse({
    employerContributionCents: 0,
    householdSize: 1,
    recommendedPlans: [
      { plan: { hiosPlanId: 'A', premiumCents: 50000 } },
      { plan: { hiosPlanId: 'B', premiumCents: 0 } },
      { plan: { hiosPlanId: 'C', premiumCents: 0 } },
    ],
  })
  assert.deepEqual(result.response.plans.map((p) => p.hiosPlanId), ['A'])
  assert.equal(result.droppedUnpriced, 2)
})

test('every plan unpriced is reported as such rather than as an empty result', () => {
  const result = coerceHotwireResponse({
    recommendedPlans: [{ plan: { hiosPlanId: 'A', premiumCents: 0 } }],
  })
  assert.equal(result.response.plans.length, 0)
  assert.equal(result.droppedUnpriced, 1)
})

test('an entry with no plan or no HIOS id is skipped without counting as unpriced', () => {
  const result = coerceHotwireResponse({
    recommendedPlans: [{}, { plan: {} }, { plan: { hiosPlanId: 'A', premiumCents: 1 } }],
  })
  assert.equal(result.response.plans.length, 1)
  assert.equal(result.droppedUnpriced, 0)
})

test('a missing allowance or household size degrades rather than throwing', () => {
  const result = coerceHotwireResponse({ recommendedPlans: [] })
  assert.equal(result.employerContributionCents, 0)
  assert.equal(result.householdSize, null)
  assert.deepEqual(result.response.plans, [])
})

test('a body without recommendedPlans fails loudly', () => {
  assert.throws(() => coerceHotwireResponse({ plans: [] }), /no `recommendedPlans` array/)
  assert.throws(() => coerceHotwireResponse(null), /not an object/)
  assert.throws(() => coerceHotwireResponse('nope'), /not an object/)
})
