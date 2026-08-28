import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  coverageMatch,
  coveragesByPlan,
  inNetworkCents,
  inNetworkCostShare,
  isCoveredTier,
  planCoverage,
} from './coverage'
import type { IdeonPlan } from './types'

test('v8 returns the cost share as an object', () => {
  assert.equal(
    inNetworkCostShare({ in_network: '$6,000', out_of_network: 'Not Covered', limit: null }),
    '$6,000',
  )
})

test('v7 returns it as one string and the in-network half is extracted', () => {
  assert.equal(
    inNetworkCostShare('In-Network: $6,000 / Out-of-Network: Not Covered'),
    '$6,000',
  )
  assert.equal(inNetworkCents('In-Network: $6,000 / Out-of-Network: Not Covered'), 600000)
})

test('a v7 string with no in-network prefix falls back to the whole value', () => {
  assert.equal(inNetworkCostShare('Not Applicable'), 'Not Applicable')
  assert.equal(inNetworkCents('Not Applicable'), null)
})

test('an absent cost share is null in either version', () => {
  assert.equal(inNetworkCostShare(undefined), null)
  assert.equal(inNetworkCostShare(null), null)
  assert.equal(inNetworkCents(undefined), null)
})

test('all three of Ideon’s uncovered tiers count as not covered', () => {
  // member-client's not-covered-statuses has three values; an earlier version
  // here was missing no_coverage, so those drugs counted as covered.
  assert.equal(isCoveredTier('no_coverage'), false)
  assert.equal(isCoveredTier('not_listed'), false)
  assert.equal(isCoveredTier('not_covered'), false)
  assert.equal(isCoveredTier('preferred_generic'), true)
  assert.equal(isCoveredTier(null), false)
  assert.equal(isCoveredTier(''), false)
})

test('coverage rows repeated across pages are deduped per plan and package', () => {
  // Ideon returns a plan's coverage on every page of a paged search, so merging
  // four pages would otherwise report 4/4 drugs for a single selection.
  const rows = [
    { plan_id: 'A', drug_package_id: 'X', tier: 'preferred_generic' },
    { plan_id: 'A', drug_package_id: 'X', tier: 'preferred_generic' },
    { plan_id: 'A', drug_package_id: 'Y', tier: 'not_covered' },
    { plan_id: 'B', drug_package_id: 'X', tier: 'not_listed' },
  ]
  const byPlan = coveragesByPlan(rows)
  assert.equal(byPlan.get('A')?.length, 2)
  assert.equal(byPlan.get('B')?.length, 1)
})

test('coverage rows with no plan or package id are dropped', () => {
  const byPlan = coveragesByPlan([{ tier: 'x' }, { plan_id: 'A', tier: 'x' }])
  assert.equal(byPlan.size, 0)
})

test('provider coverage reads in_network per plan', () => {
  const plan = {
    id: 'A',
    providers: [
      { npi: 1, in_network: true },
      { npi: 2, in_network: false },
      { npi: null, in_network: true },
    ],
  } as IdeonPlan
  assert.deepEqual(planCoverage(plan), {
    providers: [
      { npi: 1, inNetwork: true },
      { npi: 2, inNetwork: false },
    ],
    drugs: [],
  })
})

test('drug coverage carries tier and the prior-auth / quantity flags', () => {
  const coverage = planCoverage({ id: 'A' } as IdeonPlan, [
    {
      plan_id: 'A',
      drug_package_id: 'X',
      tier: 'preferred_generic',
      prior_authorization: true,
      quantity_limit: false,
    },
  ])
  assert.deepEqual(coverage.drugs, [
    {
      ndc: 'X',
      tier: 'preferred_generic',
      covered: true,
      priorAuthorization: true,
      quantityLimit: false,
    },
  ])
})

test('coverage match has three states, so partial is not the same as none', () => {
  assert.equal(coverageMatch(3, 3), 'match')
  assert.equal(coverageMatch(1, 3), 'partial')
  assert.equal(coverageMatch(0, 3), 'none')
})

test('nothing selected is none, not a vacuous match', () => {
  assert.equal(coverageMatch(0, 0), 'none')
})
