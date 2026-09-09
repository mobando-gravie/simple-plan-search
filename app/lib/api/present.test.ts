import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PricedPlan } from '../services/planSearch'
import { coverageDetail, describeQuery, planFull, planSummary, type Selections } from './present'
import { DEFAULT_FILTERS } from '../planFilter'
import { DEFAULT_CRITERIA } from '../services/planSearch'

function plan(over: Partial<PricedPlan> = {}): PricedPlan {
  return {
    hiosPlanId: '25303NY0630001',
    planName: 'Alpha Bronze',
    carrierName: 'Oscar',
    carrierId: '25303',
    metalLevel: 'bronze',
    planType: 'HMO',
    ideonPremiumCents: 40000,
    effectiveYear: 2026,
    hsaEligible: false,
    logoUrl: null,
    offMarket: true,
    documents: [{ type: 'summary_of_benefits_and_coverage', url: 'https://example/sbc.pdf' }],
    formularyUrl: null,
    benefits: { primary_care_physician: { in_network: '$30', out_of_network: null, limit: null } },
    coverage: { providers: [], drugs: [] },
    deductibleIndividualCents: 500000,
    deductibleFamilyCents: 1000000,
    outOfPocketMaxIndividualCents: 800000,
    outOfPocketMaxFamilyCents: 1600000,
    applicantPremiums: [],
    compositeRated: false,
    enrollmentType: 'EASY_ENROLL',
    gravieMultiplier: 1.02,
    gravieFlatCents: 0,
    finalPremiumCents: 40800,
    modifierId: 7,
    modifierLabel: 'NY 2026',
    ...over,
  }
}

const EMPTY: Selections = { providers: [], drugs: [], allowanceCents: 0 }

test('a summary quotes the Gravie-priced premium alongside the raw Ideon one', () => {
  const summary = planSummary(plan(), EMPTY)
  assert.equal(summary.premiumCents, 40800)
  assert.equal(summary.ideonPremiumCents, 40000)
  assert.equal(summary.gravieMultiplier, 1.02)
  assert.equal(summary.enrollmentType, 'EASY_ENROLL')
})

test('netPremiumCents appears only when an allowance was supplied, floored at zero', () => {
  assert.equal(planSummary(plan(), EMPTY).netPremiumCents, null)
  assert.equal(planSummary(plan(), { ...EMPTY, allowanceCents: 30000 }).netPremiumCents, 10800)
  assert.equal(planSummary(plan(), { ...EMPTY, allowanceCents: 90000 }).netPremiumCents, 0)
})

test('coverage match is null when nothing was asked about', () => {
  const summary = planSummary(plan(), EMPTY)
  assert.deepEqual(summary.providerCoverage, { covered: 0, total: 0, match: null })
  assert.deepEqual(summary.drugCoverage, { covered: 0, total: 0, match: null })
})

test('coverage counts read off the caller list, so a plan with no row is not covered', () => {
  const selections: Selections = {
    allowanceCents: 0,
    providers: [
      { npi: 1, name: 'In network' },
      { npi: 2, name: 'No row returned' },
    ],
    drugs: [
      { medId: 10, ndc: 'ndc-1', name: 'Lipitor' },
      { medId: 0, ndc: null, name: 'RxCUI 999', rxcui: 999 },
    ],
  }
  const covered = plan({
    coverage: {
      providers: [{ npi: 1, inNetwork: true }],
      drugs: [
        {
          ndc: 'ndc-1',
          tier: 'preferred_generic',
          covered: true,
          priorAuthorization: true,
          quantityLimit: false,
          stepTherapy: false,
        },
      ],
    },
  })

  const summary = planSummary(covered, selections)
  assert.deepEqual(summary.providerCoverage, { covered: 1, total: 2, match: 'partial' })
  assert.deepEqual(summary.drugCoverage, { covered: 1, total: 2, match: 'partial' })

  const detail = coverageDetail(covered, selections)
  assert.deepEqual(
    detail.providers.map((p) => [p.npi, p.inNetwork]),
    [
      [1, true],
      [2, false],
    ],
  )
  assert.deepEqual(detail.drugs[0], {
    medId: 10,
    ndc: 'ndc-1',
    rxcui: null,
    name: 'Lipitor',
    covered: true,
    tier: 'preferred_generic',
    tierLabel: 'Preferred Generic',
    priorAuthorization: true,
    quantityLimit: false,
    stepTherapy: false,
  })
  // An identifier that never resolved has no NDC to ask about, so it can never be covered.
  assert.equal(detail.drugs[1].covered, false)
  assert.equal(detail.drugs[1].tierLabel, 'Not covered')
})

test('the full view adds documents, benefits and per-selection coverage', () => {
  const full = planFull(plan(), EMPTY)
  assert.deepEqual(full.documents, [
    { type: 'summary_of_benefits_and_coverage', url: 'https://example/sbc.pdf' },
  ])
  assert.deepEqual(full.benefits.careServices, [
    { label: 'Primary Care', inNetwork: '$30', outOfNetwork: 'Not Available' },
  ])
  assert.deepEqual(full.benefits.additionalCoverages, [])
  assert.equal(full.premiumCents, 40800)
})

test('describeQuery echoes the household flat and relation-tagged', () => {
  const described = describeQuery(
    {
      ...DEFAULT_CRITERIA,
      zipCode: '11201',
      household: {
        member: { age: 40, tobacco: true },
        spouse: { age: 38, tobacco: false },
        children: [{ age: 8 }],
      },
      enrollmentDate: '2026-10-01',
    },
    DEFAULT_FILTERS,
    { view: 'summary', limit: 25 },
  )

  assert.equal(described.zip, '11201')
  assert.equal(described.enrollmentDate, '2026-10-01')
  assert.equal(described.limit, 25)
  assert.deepEqual(described.household, [
    { age: 40, tobacco: true, relation: 'primary' },
    { age: 38, tobacco: false, relation: 'spouse' },
    { age: 8, tobacco: false, relation: 'child' },
  ])
})
