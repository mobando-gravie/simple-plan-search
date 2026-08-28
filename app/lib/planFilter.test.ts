import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  allProvidersInNetwork,
  applyPlanFilters,
  coversAllDrugs,
  DEFAULT_FILTERS,
  filterOptions,
} from './planFilter'
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

const covered = {
  tier: 'generic',
  covered: true,
  priorAuthorization: false,
  quantityLimit: false,
  stepTherapy: false,
}

test('no filters keeps everything, sorted by premium ascending', () => {
  const plans = [plan({ hiosPlanId: 'B', finalPremiumCents: 90000 }), plan({ finalPremiumCents: 10000 })]
  const out = applyPlanFilters(plans, DEFAULT_FILTERS)
  assert.deepEqual(out.map((p) => p.finalPremiumCents), [10000, 90000])
})

test('search matches plan name, carrier and HIOS id', () => {
  const plans = [
    plan({ hiosPlanId: 'ZZZ111', planName: 'Alpha', carrierName: 'Oscar' }),
    plan({ hiosPlanId: 'QQQ222', planName: 'Beta', carrierName: 'Molina' }),
  ]
  const hits = (search: string) =>
    applyPlanFilters(plans, { ...DEFAULT_FILTERS, search }).map((p) => p.hiosPlanId)
  assert.deepEqual(hits('alpha'), ['ZZZ111'])
  assert.deepEqual(hits('molina'), ['QQQ222'])
  assert.deepEqual(hits('QQQ'), ['QQQ222'])
  assert.deepEqual(hits('nothing'), [])
})

test('metal, type and carrier filters are OR within a group and AND across groups', () => {
  const plans = [
    plan({ hiosPlanId: 'A', metalLevel: 'bronze', carrierName: 'Oscar' }),
    plan({ hiosPlanId: 'B', metalLevel: 'gold', carrierName: 'Oscar' }),
    plan({ hiosPlanId: 'C', metalLevel: 'gold', carrierName: 'Molina' }),
  ]
  const out = applyPlanFilters(plans, {
    ...DEFAULT_FILTERS,
    metalLevels: ['bronze', 'gold'],
    carriers: ['Oscar'],
  })
  assert.deepEqual(out.map((p) => p.hiosPlanId), ['A', 'B'])
})

test('max premium and max deductible are inclusive at the boundary', () => {
  const plans = [plan({ hiosPlanId: 'A', finalPremiumCents: 50000 })]
  assert.equal(applyPlanFilters(plans, { ...DEFAULT_FILTERS, maxPremiumCents: 50000 }).length, 1)
  assert.equal(applyPlanFilters(plans, { ...DEFAULT_FILTERS, maxPremiumCents: 49999 }).length, 0)
})

test('an unpriced plan cannot satisfy a premium cap', () => {
  // Showing a null premium under "max $500" would assert something we do not know.
  const plans = [plan({ finalPremiumCents: null })]
  assert.equal(applyPlanFilters(plans, { ...DEFAULT_FILTERS, maxPremiumCents: 50000 }).length, 0)
  assert.equal(applyPlanFilters(plans, DEFAULT_FILTERS).length, 1)
})

test('unpriced plans sort last rather than first', () => {
  const plans = [
    plan({ hiosPlanId: 'null', finalPremiumCents: null }),
    plan({ hiosPlanId: 'cheap', finalPremiumCents: 100 }),
  ]
  assert.deepEqual(
    applyPlanFilters(plans, DEFAULT_FILTERS).map((p) => p.hiosPlanId),
    ['cheap', 'null'],
  )
})

test('coverage helpers require at least one selection', () => {
  assert.equal(coversAllDrugs(plan()), false)
  assert.equal(allProvidersInNetwork(plan()), false)
})

test('the drug filter keeps only plans covering every selected drug', () => {
  const plans = [
    plan({ hiosPlanId: 'all', coverage: { providers: [], drugs: [{ ...covered, ndc: 'X' }] } }),
    plan({
      hiosPlanId: 'partial',
      coverage: {
        providers: [],
        drugs: [{ ...covered, ndc: 'X' }, { ...covered, ndc: 'Y', covered: false }],
      },
    }),
  ]
  const out = applyPlanFilters(plans, { ...DEFAULT_FILTERS, coversAllDrugs: true })
  assert.deepEqual(out.map((p) => p.hiosPlanId), ['all'])
})

test('the provider filter keeps only plans with every provider in network', () => {
  const plans = [
    plan({ hiosPlanId: 'in', coverage: { providers: [{ npi: 1, inNetwork: true }], drugs: [] } }),
    plan({
      hiosPlanId: 'mixed',
      coverage: {
        providers: [{ npi: 1, inNetwork: true }, { npi: 2, inNetwork: false }],
        drugs: [],
      },
    }),
  ]
  const out = applyPlanFilters(plans, { ...DEFAULT_FILTERS, allProvidersInNetwork: true })
  assert.deepEqual(out.map((p) => p.hiosPlanId), ['in'])
})

test('sorting by each key orders as expected', () => {
  const plans = [
    plan({ hiosPlanId: 'B', planName: 'Beta', deductibleIndividualCents: 100, outOfPocketMaxIndividualCents: 900 }),
    plan({ hiosPlanId: 'A', planName: 'Alpha', deductibleIndividualCents: 900, outOfPocketMaxIndividualCents: 100 }),
  ]
  const order = (sort: 'deductible-asc' | 'oopMax-asc' | 'name') =>
    applyPlanFilters(plans, { ...DEFAULT_FILTERS, sort }).map((p) => p.hiosPlanId)
  assert.deepEqual(order('deductible-asc'), ['B', 'A'])
  assert.deepEqual(order('oopMax-asc'), ['A', 'B'])
  assert.deepEqual(order('name'), ['A', 'B'])
})

test('filter options are the distinct values present, sorted', () => {
  const plans = [
    plan({ metalLevel: 'gold', planType: 'PPO', carrierName: 'Molina' }),
    plan({ metalLevel: 'bronze', planType: 'PPO', carrierName: 'Oscar' }),
    plan({ metalLevel: 'gold', planType: null, carrierName: 'Oscar' }),
  ]
  assert.deepEqual(filterOptions(plans), {
    metalLevels: ['bronze', 'gold'],
    planTypes: ['PPO'],
    carriers: ['Molina', 'Oscar'],
  })
})

test('free floor puts the richest plan you can take for nothing first', () => {
  // Allowance $400. The $398 plan is the most plan available at no cost, so it
  // outranks cheaper free plans; anything you would pay for comes after all of them.
  const plans = [
    plan({ hiosPlanId: 'over-50', finalPremiumCents: 45000 }),
    plan({ hiosPlanId: 'free-290', finalPremiumCents: 29000 }),
    plan({ hiosPlanId: 'over-10', finalPremiumCents: 41000 }),
    plan({ hiosPlanId: 'free-398', finalPremiumCents: 39800 }),
    plan({ hiosPlanId: 'free-375', finalPremiumCents: 37500 }),
  ]
  const out = applyPlanFilters(plans, { ...DEFAULT_FILTERS, sort: 'free-floor' }, 40000)
  assert.deepEqual(out.map((p) => p.hiosPlanId), [
    'free-398',
    'free-375',
    'free-290',
    'over-10',
    'over-50',
  ])
})

test('a plan exactly at the allowance is still free and ranks top', () => {
  const plans = [
    plan({ hiosPlanId: 'over', finalPremiumCents: 40001 }),
    plan({ hiosPlanId: 'exact', finalPremiumCents: 40000 }),
  ]
  const out = applyPlanFilters(plans, { ...DEFAULT_FILTERS, sort: 'free-floor' }, 40000)
  assert.deepEqual(out.map((p) => p.hiosPlanId), ['exact', 'over'])
})

test('free floor never ranks a plan you pay for above a free one', () => {
  // The trap that |premium - allowance| would fall into: $410 is 10 away and $375
  // is 25 away, but $410 costs money and $375 does not.
  const plans = [
    plan({ hiosPlanId: 'paid-410', finalPremiumCents: 41000 }),
    plan({ hiosPlanId: 'free-375', finalPremiumCents: 37500 }),
  ]
  const out = applyPlanFilters(plans, { ...DEFAULT_FILTERS, sort: 'free-floor' }, 40000)
  assert.deepEqual(out.map((p) => p.hiosPlanId), ['free-375', 'paid-410'])
})

test('with no allowance every plan is over it, so free floor is cheapest-first', () => {
  const plans = [
    plan({ hiosPlanId: 'b', finalPremiumCents: 90000 }),
    plan({ hiosPlanId: 'a', finalPremiumCents: 10000 }),
  ]
  const out = applyPlanFilters(plans, { ...DEFAULT_FILTERS, sort: 'free-floor' })
  assert.deepEqual(out.map((p) => p.hiosPlanId), ['a', 'b'])
})

test('unpriced plans sort last under free floor too', () => {
  const plans = [
    plan({ hiosPlanId: 'null', finalPremiumCents: null }),
    plan({ hiosPlanId: 'priced', finalPremiumCents: 39000 }),
  ]
  const out = applyPlanFilters(plans, { ...DEFAULT_FILTERS, sort: 'free-floor' }, 40000)
  assert.deepEqual(out.map((p) => p.hiosPlanId), ['priced', 'null'])
})
