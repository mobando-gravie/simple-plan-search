import { test } from 'node:test'
import assert from 'node:assert/strict'
import { benefitValues, CARE_SERVICES, formatTier, sbcUrl } from './planBenefits'

test('v8 object cost shares split into both columns', () => {
  const values = benefitValues(
    {
      preventative_care: { in_network: '$0', out_of_network: 'Not Covered', limit: null },
    },
    CARE_SERVICES,
  )
  assert.deepEqual(values, [
    { label: 'Preventive Care', inNetwork: '$0', outOfNetwork: 'Not Covered' },
  ])
})

test('v7 string cost shares split into both columns too', () => {
  const values = benefitValues(
    { specialist: 'In-Network: $40 after deductible / Out-of-Network: Not Covered' },
    CARE_SERVICES,
  )
  assert.deepEqual(values, [
    { label: 'Specialist', inNetwork: '$40 after deductible', outOfNetwork: 'Not Covered' },
  ])
})

test('rows the plan does not publish are dropped, not rendered blank', () => {
  const values = benefitValues({ specialist: null }, CARE_SERVICES)
  assert.deepEqual(values, [])
})

test('a half-published row keeps the side that exists', () => {
  const values = benefitValues(
    { specialist: { in_network: '$40', out_of_network: null, limit: null } },
    CARE_SERVICES,
  )
  assert.deepEqual(values, [
    { label: 'Specialist', inNetwork: '$40', outOfNetwork: 'Not Available' },
  ])
})

test('rows come back in the section order, not the object order', () => {
  const values = benefitValues(
    {
      specialist: { in_network: 'b', out_of_network: null, limit: null },
      preventative_care: { in_network: 'a', out_of_network: null, limit: null },
    },
    CARE_SERVICES,
  )
  assert.deepEqual(
    values.map((v) => v.label),
    ['Preventive Care', 'Specialist'],
  )
})

test('tiers render as words', () => {
  assert.equal(formatTier('preferred_generic'), 'Preferred Generic')
  assert.equal(formatTier('specialty'), 'Specialty')
  assert.equal(formatTier(null), 'Not covered')
})

test('sbcUrl prefers the SBC, else the first document, else null', () => {
  const sbc = { type: 'summary_of_benefits_and_coverage', url: 'https://x/sbc.pdf' }
  const formulary = { type: 'formulary', url: 'https://x/drugs.pdf' }

  assert.equal(sbcUrl([formulary, sbc]), sbc.url)
  assert.equal(sbcUrl([formulary]), formulary.url)
  assert.equal(sbcUrl([]), null)
})
