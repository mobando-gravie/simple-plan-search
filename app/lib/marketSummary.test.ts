import assert from 'node:assert/strict'
import { test } from 'node:test'
import { marketSummary, spread } from './marketSummary'
import type { PricedPlan } from './services/planSearch'

function plan(over: Partial<PricedPlan> = {}): PricedPlan {
  return {
    hiosPlanId: 'A',
    planName: 'Alpha Bronze',
    carrierName: 'Oscar',
    carrierId: '1',
    metalLevel: 'bronze',
    planType: 'HMO',
    ideonPremiumCents: 40000,
    effectiveYear: 2026,
    hsaEligible: false,
    logoUrl: null,
    offMarket: true,
    documents: [],
    formularyUrl: null,
    benefits: {},
    coverage: { providers: [], drugs: [] },
    deductibleIndividualCents: 500000,
    deductibleFamilyCents: 1000000,
    outOfPocketMaxIndividualCents: 800000,
    outOfPocketMaxFamilyCents: 1600000,
    applicantPremiums: [],
    compositeRated: false,
    enrollmentType: 'SELF_ENROLL',
    gravieMultiplier: 1,
    gravieFlatCents: 0,
    finalPremiumCents: 40000,
    modifierId: null,
    modifierLabel: null,
    ...over,
  }
}

const NOTHING_SELECTED = { providers: [], drugs: [] }

test('spread reports lowest, median and highest in cents', () => {
  assert.deepEqual(spread([300, 100, 200]), {
    lowestCents: 100,
    medianCents: 200,
    highestCents: 300,
  })
})

test('an even count averages the two middle values, rounded to a whole cent', () => {
  assert.equal(spread([100, 201, 300, 400]).medianCents, 251)
})

test('nulls are dropped, not counted as zero', () => {
  assert.deepEqual(spread([null, 500, null]), {
    lowestCents: 500,
    medianCents: 500,
    highestCents: 500,
  })
  assert.deepEqual(spread([null, null]), {
    lowestCents: null,
    medianCents: null,
    highestCents: null,
  })
})

test('groups are counted and priced, metals in benefit order', () => {
  const summary = marketSummary(
    [
      plan({ metalLevel: 'gold', finalPremiumCents: 60000 }),
      plan({ metalLevel: 'bronze', finalPremiumCents: 30000 }),
      plan({ metalLevel: 'bronze', finalPremiumCents: 35000 }),
    ],
    NOTHING_SELECTED,
  )

  assert.equal(summary.planCount, 3)
  assert.deepEqual(summary.metalLevels, [
    { level: 'bronze', planCount: 2, lowestPremiumCents: 30000 },
    { level: 'gold', planCount: 1, lowestPremiumCents: 60000 },
  ])
  assert.deepEqual(summary.premium, {
    lowestCents: 30000,
    medianCents: 35000,
    highestCents: 60000,
  })
})

test('carriers and plan types read biggest first', () => {
  const summary = marketSummary(
    [
      plan({ carrierName: 'Oscar', carrierId: '25303', planType: 'EPO' }),
      plan({ carrierName: 'Ambetter', carrierId: '74289', planType: 'HMO' }),
      plan({ carrierName: 'Ambetter', carrierId: '74289', planType: 'HMO' }),
    ],
    NOTHING_SELECTED,
  )

  assert.deepEqual(
    summary.carriers.map((c) => [c.name, c.carrierId, c.planCount]),
    [
      ['Ambetter', '74289', 2],
      ['Oscar', '25303', 1],
    ],
  )
  assert.deepEqual(
    summary.planTypes.map((t) => [t.type, t.planCount]),
    [
      ['HMO', 2],
      ['EPO', 1],
    ],
  )
})

test('a plan with no metal level or plan type is left out of those groups', () => {
  const summary = marketSummary([plan({ metalLevel: null, planType: null })], NOTHING_SELECTED)
  assert.deepEqual(summary.metalLevels, [])
  assert.deepEqual(summary.planTypes, [])
  assert.equal(summary.planCount, 1)
})

test('coverage is null until something is asked about', () => {
  assert.equal(marketSummary([plan()], NOTHING_SELECTED).coverage, null)
})

test('coverage counts plans covering all providers, all drugs, and both', () => {
  const providers = [{ npi: 1, name: 'A' }, { npi: 2, name: 'B' }]
  const drugs = [{ medId: 10, ndc: 'ndc-1', name: 'Lipitor' }]
  const drugRow = {
    ndc: 'ndc-1',
    tier: 'generic',
    covered: true,
    priorAuthorization: false,
    quantityLimit: false,
    stepTherapy: false,
  }

  const summary = marketSummary(
    [
      plan({
        hiosPlanId: 'both',
        coverage: {
          providers: [
            { npi: 1, inNetwork: true },
            { npi: 2, inNetwork: true },
          ],
          drugs: [drugRow],
        },
      }),
      plan({
        hiosPlanId: 'providers-only',
        coverage: {
          providers: [
            { npi: 1, inNetwork: true },
            { npi: 2, inNetwork: true },
          ],
          drugs: [{ ...drugRow, covered: false, tier: 'not_covered' }],
        },
      }),
      plan({
        hiosPlanId: 'drugs-only',
        coverage: {
          providers: [
            { npi: 1, inNetwork: true },
            { npi: 2, inNetwork: false },
          ],
          drugs: [drugRow],
        },
      }),
    ],
    { providers, drugs },
  )

  assert.deepEqual(summary.coverage, {
    providersRequested: 2,
    drugsRequested: 1,
    plansCoveringAllProviders: 2,
    plansCoveringAllDrugs: 2,
    plansCoveringEverything: 1,
  })
})

test('hsaEligibleCount counts only HSA-eligible plans', () => {
  const summary = marketSummary(
    [plan({ hsaEligible: true }), plan(), plan({ hsaEligible: true })],
    NOTHING_SELECTED,
  )
  assert.equal(summary.hsaEligibleCount, 2)
})
