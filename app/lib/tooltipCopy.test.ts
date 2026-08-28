import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  benefitTooltip,
  metalTooltip,
  planTypeTooltip,
  TOOLTIP_COPY,
  type TooltipKey,
} from './tooltipCopy'

test('every key has non-empty copy', () => {
  for (const [key, copy] of Object.entries(TOOLTIP_COPY)) {
    assert.ok(copy.length > 20, `${key} is too short to be real copy`)
  }
})

test('no copy carries member-client’s interpolation placeholder', () => {
  // :benefit in the source embeds a literal MEMBER_BENEFIT that its renderer
  // substitutes; a straight port would have shipped it to screen.
  for (const [key, copy] of Object.entries(TOOLTIP_COPY)) {
    assert.ok(!copy.includes('MEMBER_BENEFIT'), `${key} still has the placeholder`)
  }
})

test('the benefit line interpolates the amount', () => {
  const copy = benefitTooltip('$400.00')
  assert.match(copy, /After \$400\.00 Benefit/)
  assert.ok(!copy.includes('MEMBER_BENEFIT'))
})

test('each metal level resolves to its own entry', () => {
  const cases: [string, TooltipKey][] = [
    ['bronze', 'bronze'],
    ['silver', 'silver'],
    ['gold', 'gold'],
    ['platinum', 'platinum'],
    ['catastrophic', 'catastrophic'],
  ]
  for (const [metal, key] of cases) assert.equal(metalTooltip(metal), key)
})

test('expanded_bronze falls back to bronze, not to the generic tier copy', () => {
  // Ideon returns expanded_bronze; member-client's dictionary has no entry for it.
  assert.equal(metalTooltip('expanded_bronze'), 'bronze')
})

test('an unknown or absent metal falls back to the generic tier copy', () => {
  assert.equal(metalTooltip('mystery'), 'tier')
  assert.equal(metalTooltip(null), 'tier')
})

test('each plan type resolves to its own entry', () => {
  for (const type of ['HMO', 'PPO', 'EPO', 'POS']) {
    assert.equal(planTypeTooltip(type), type.toLowerCase())
  }
})

test('an unknown or absent plan type falls back to the generic network copy', () => {
  assert.equal(planTypeTooltip('HDHP'), 'network')
  assert.equal(planTypeTooltip(null), 'network')
})
