import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyModifier, findModifier, IDENTITY, specificity, type GravieModifier, type ModifierTarget } from './modifier'

function modifier(overrides: Partial<GravieModifier> = {}): GravieModifier {
  return {
    id: 1,
    batchId: 1,
    hiosPlanId: null,
    carrierId: null,
    state: null,
    ratingArea: null,
    metalLevel: null,
    effectiveYear: null,
    multiplier: 1,
    flatCents: 0,
    label: null,
    ...overrides,
  }
}

const OSCAR_GOLD: ModifierTarget = {
  hiosPlanId: '74289NY2770005',
  carrierId: '74289',
  state: 'NY',
  ratingArea: null,
  metalLevel: 'gold',
  effectiveYear: 2026,
}

test('applyModifier is round(ideon x multiplier) + flat', () => {
  assert.equal(applyModifier(156443, { multiplier: 1.035, flatCents: 0 }), 161919)
  assert.equal(applyModifier(70210, { multiplier: 1, flatCents: 1250 }), 71460)
  assert.equal(applyModifier(70210, { multiplier: 1.028, flatCents: 250 }), 72426)
})

test('applyModifier with no modifier returns the premium untouched', () => {
  assert.equal(applyModifier(156443), 156443)
  assert.equal(applyModifier(156443, IDENTITY), 156443)
})

test('applyModifier rounds the multiplied amount before adding the flat cents', () => {
  // 100_01 x 1.005 = 100_51.005 -> 10051, then +99 = 10150. Adding first would give 10150 too,
  // so use a case where the order matters: 333 x 1.5 = 499.5 -> 500, +1 = 501.
  assert.equal(applyModifier(333, { multiplier: 1.5, flatCents: 1 }), 501)
})

test('specificity sums the weights of the columns a rule actually pins', () => {
  assert.equal(specificity(modifier(), OSCAR_GOLD), 0)
  assert.equal(specificity(modifier({ state: 'NY' }), OSCAR_GOLD), 2)
  assert.equal(specificity(modifier({ state: 'NY', metalLevel: 'gold' }), OSCAR_GOLD), 6)
  assert.equal(specificity(modifier({ hiosPlanId: '74289NY2770005' }), OSCAR_GOLD), 32)
})

test('specificity is null when any pinned column disagrees', () => {
  assert.equal(specificity(modifier({ state: 'MN' }), OSCAR_GOLD), null)
  assert.equal(specificity(modifier({ metalLevel: 'silver' }), OSCAR_GOLD), null)
  assert.equal(specificity(modifier({ effectiveYear: 2025 }), OSCAR_GOLD), null)
})

test('a pinned column cannot match a plan whose value is unknown', () => {
  const noCarrier = { ...OSCAR_GOLD, carrierId: null }
  assert.equal(specificity(modifier({ carrierId: '74289' }), noCarrier), null)
})

test('matching ignores case and surrounding whitespace', () => {
  assert.equal(specificity(modifier({ state: ' ny ', metalLevel: 'GOLD' }), OSCAR_GOLD), 6)
})

test('findModifier picks the most specific matching row', () => {
  const rows = [
    modifier({ id: 1, state: 'NY', effectiveYear: 2026, multiplier: 1.02 }),
    modifier({ id: 2, state: 'NY', metalLevel: 'gold', effectiveYear: 2026, multiplier: 1.035 }),
    modifier({ id: 3, hiosPlanId: '74289NY2770005', effectiveYear: 2026, multiplier: 1.055 }),
  ]
  assert.equal(findModifier(rows, OSCAR_GOLD)?.id, 3)
})

test('a statewide default still applies to a plan the overrides do not cover', () => {
  const rows = [
    modifier({ id: 1, state: 'NY', effectiveYear: 2026, multiplier: 1.02 }),
    modifier({ id: 2, state: 'NY', metalLevel: 'gold', effectiveYear: 2026, multiplier: 1.035 }),
  ]
  const bronze = { ...OSCAR_GOLD, metalLevel: 'bronze', hiosPlanId: '74289NY0000001' }
  assert.equal(findModifier(rows, bronze)?.id, 1)
})

test('findModifier breaks a specificity tie toward the most recently imported row', () => {
  const rows = [
    modifier({ id: 7, state: 'NY', multiplier: 1.01 }),
    modifier({ id: 9, state: 'NY', multiplier: 1.09 }),
    modifier({ id: 8, state: 'NY', multiplier: 1.08 }),
  ]
  assert.equal(findModifier(rows, OSCAR_GOLD)?.id, 9)
})

test('findModifier returns null when nothing matches, so callers can say "unmodified"', () => {
  const rows = [modifier({ id: 1, state: 'MN' }), modifier({ id: 2, metalLevel: 'platinum' })]
  assert.equal(findModifier(rows, OSCAR_GOLD), null)
  assert.equal(findModifier([], OSCAR_GOLD), null)
})

test('a fully wildcard row matches everything at the lowest priority', () => {
  const rows = [modifier({ id: 1, multiplier: 1.5 }), modifier({ id: 2, state: 'NY', multiplier: 1.02 })]
  assert.equal(findModifier(rows, OSCAR_GOLD)?.id, 2)
  assert.equal(findModifier(rows, { ...OSCAR_GOLD, state: 'MN' })?.id, 1)
})
