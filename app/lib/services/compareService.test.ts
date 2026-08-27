import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compare } from './compareService'
import type { PricedPlan, SearchResult } from './planSearch'
import type { FetchPlansResponse } from '../shopping/types'

function ourPlan(overrides: Partial<PricedPlan> = {}): PricedPlan {
  return {
    hiosPlanId: '74289NY2770005',
    planName: 'Gold Classic',
    carrierName: 'Oscar',
    carrierId: '74289',
    metalLevel: 'gold',
    planType: 'EPO',
    ideonPremiumCents: 156443,
    effectiveYear: 2026,
    hsaEligible: false,
    deductibleIndividualCents: 77500,
    deductibleFamilyCents: 155000,
    outOfPocketMaxIndividualCents: 1015000,
    outOfPocketMaxFamilyCents: 2030000,
    gravieMultiplier: 1.035,
    gravieFlatCents: 0,
    finalPremiumCents: 161919,
    modifierId: 3,
    modifierLabel: 'NY gold load',
    ...overrides,
  }
}

function ours(plans: PricedPlan[]): SearchResult {
  return {
    plans,
    meta: {
      total: plans.length,
      fipsCode: '36047',
      state: 'NY',
      countyName: 'Kings County',
      householdSize: 1,
      modifiersApplied: plans.filter((p) => p.modifierId !== null).length,
    },
    cache: { hit: false, fetchedAt: new Date('2026-08-27T00:00:00Z'), ageSeconds: 0 },
  }
}

test('a plan priced identically on both sides has a zero delta and is within tolerance', () => {
  const baseline: FetchPlansResponse = {
    plans: [{ hiosPlanId: '74289NY2770005', premiumCents: 161919 }],
  }
  const report = compare(ours([ourPlan()]), baseline, 0)

  assert.equal(report.matched.length, 1)
  assert.equal(report.matched[0].deltaCents, 0)
  assert.equal(report.matched[0].deltaPct, 0)
  assert.equal(report.matched[0].withinTolerance, true)
  assert.equal(report.summary.overTolerance, 0)
})

test('the delta compares shopping against the modified premium, not the raw Ideon one', () => {
  const baseline: FetchPlansResponse = {
    plans: [{ hiosPlanId: '74289NY2770005', premiumCents: 156443 }],
  }
  const report = compare(ours([ourPlan()]), baseline, 0)

  // 161919 (Ideon 156443 x 1.035) - 156443 = 5476, not 0.
  assert.equal(report.matched[0].deltaCents, 5476)
  assert.equal(report.matched[0].ideonPremiumCents, 156443)
  assert.equal(report.matched[0].finalPremiumCents, 161919)
})

test('tolerance is applied to the absolute delta in both directions', () => {
  const under = compare(
    ours([ourPlan()]),
    { plans: [{ hiosPlanId: '74289NY2770005', premiumCents: 161819 }] },
    100,
  )
  const over = compare(
    ours([ourPlan()]),
    { plans: [{ hiosPlanId: '74289NY2770005', premiumCents: 162020 }] },
    100,
  )
  assert.equal(under.matched[0].withinTolerance, true)
  assert.equal(over.matched[0].withinTolerance, false)
  assert.equal(over.matched[0].deltaCents, -101)
})

test('plans present on only one side are reported as orphans, not silently dropped', () => {
  const report = compare(
    ours([ourPlan(), ourPlan({ hiosPlanId: 'AAAAANY0000001' })]),
    { plans: [{ hiosPlanId: '74289NY2770005', premiumCents: 161919 }, { hiosPlanId: 'ZZZZZNY9999999', premiumCents: 50000 }] },
    0,
  )
  assert.equal(report.summary.matchedCount, 1)
  assert.deepEqual(report.onlyInOurs.map((p) => p.hiosPlanId), ['AAAAANY0000001'])
  assert.deepEqual(report.onlyInShopping.map((p) => p.hiosPlanId), ['ZZZZZNY9999999'])
})

test('an unpriced plan on either side counts as unpriced, never as agreement', () => {
  const noneOurs = compare(
    ours([ourPlan({ finalPremiumCents: null, ideonPremiumCents: null })]),
    { plans: [{ hiosPlanId: '74289NY2770005', premiumCents: 161919 }] },
    0,
  )
  const noneTheirs = compare(
    ours([ourPlan()]),
    { plans: [{ hiosPlanId: '74289NY2770005', premiumCents: null }] },
    0,
  )
  for (const report of [noneOurs, noneTheirs]) {
    assert.equal(report.matched[0].deltaCents, null)
    assert.equal(report.matched[0].withinTolerance, false)
    assert.equal(report.summary.unpricedEitherSide, 1)
    assert.equal(report.summary.withinTolerance, 0)
  }
})

test('an unpriced plan is excluded from over-tolerance, so it cannot double-count', () => {
  const report = compare(
    ours([ourPlan({ finalPremiumCents: null })]),
    { plans: [{ hiosPlanId: '74289NY2770005', premiumCents: 161919 }] },
    0,
  )
  assert.equal(report.summary.overTolerance, 0)
  assert.equal(report.summary.unpricedEitherSide, 1)
})

test('attribute mismatches outside premium are surfaced per plan', () => {
  const report = compare(
    ours([ourPlan()]),
    {
      plans: [
        {
          hiosPlanId: '74289NY2770005',
          premiumCents: 161919,
          metalLevel: 'Silver',
          planType: 'HMO',
          hsaEligible: true,
          deductibleIndividualCents: 80000,
        },
      ],
    },
    0,
  )
  assert.deepEqual(report.matched[0].attributeMismatches, [
    'metal gold vs silver',
    'type EPO vs HMO',
    'hsa false vs true',
    'deductible 77500 vs 80000',
  ])
})

test('an attribute absent from the baseline is not reported as a mismatch', () => {
  const report = compare(
    ours([ourPlan()]),
    { plans: [{ hiosPlanId: '74289NY2770005', premiumCents: 161919 }] },
    0,
  )
  assert.deepEqual(report.matched[0].attributeMismatches, [])
})

test('summary reports median and max absolute delta over matched plans', () => {
  const report = compare(
    ours([
      ourPlan({ hiosPlanId: 'A', finalPremiumCents: 10000 }),
      ourPlan({ hiosPlanId: 'B', finalPremiumCents: 10000 }),
      ourPlan({ hiosPlanId: 'C', finalPremiumCents: 10000 }),
    ]),
    {
      plans: [
        { hiosPlanId: 'A', premiumCents: 10100 },
        { hiosPlanId: 'B', premiumCents: 9500 },
        { hiosPlanId: 'C', premiumCents: 10000 },
      ],
    },
    0,
  )
  assert.equal(report.summary.medianAbsDeltaCents, 100)
  assert.equal(report.summary.maxAbsDeltaCents, 500)
})

test('an empty baseline yields no matches and no NaN statistics', () => {
  const report = compare(ours([ourPlan()]), { plans: [] }, 0)
  assert.equal(report.summary.matchedCount, 0)
  assert.equal(report.summary.medianAbsDeltaCents, null)
  assert.equal(report.summary.maxAbsDeltaCents, null)
  assert.equal(report.summary.onlyInOursCount, 1)
})

test('a zero shopping premium yields no delta percentage instead of Infinity', () => {
  const report = compare(
    ours([ourPlan()]),
    { plans: [{ hiosPlanId: '74289NY2770005', premiumCents: 0 }] },
    0,
  )
  assert.equal(report.matched[0].deltaCents, 161919)
  assert.equal(report.matched[0].deltaPct, null)
})
