import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dollarsToCents, formatCents, formatCentsDelta, parseCurrencyToCents } from './money'

test('dollarsToCents rounds to the nearest cent', () => {
  assert.equal(dollarsToCents(1564.43), 156443)
  assert.equal(dollarsToCents(0), 0)
  assert.equal(dollarsToCents(702.105), 70211)
  assert.equal(dollarsToCents(702.104), 70210)
})

test('dollarsToCents rejects a non-finite amount rather than producing NaN cents', () => {
  assert.throws(() => dollarsToCents(Number.NaN))
  assert.throws(() => dollarsToCents(Number.POSITIVE_INFINITY))
})

test('parseCurrencyToCents reads the formatted strings Ideon returns', () => {
  assert.equal(parseCurrencyToCents('$1,550'), 155000)
  assert.equal(parseCurrencyToCents('$775'), 77500)
  assert.equal(parseCurrencyToCents('12.50'), 1250)
  assert.equal(parseCurrencyToCents('  $20,300  '), 2030000)
  assert.equal(parseCurrencyToCents('$0'), 0)
})

test('parseCurrencyToCents returns null for non-numeric cost shares, not zero', () => {
  // A $0 deductible and an uncovered benefit are different facts; collapsing the
  // second to 0 would quote a plan as free.
  assert.equal(parseCurrencyToCents('Not Covered'), null)
  assert.equal(parseCurrencyToCents('Included in Medical'), null)
  assert.equal(parseCurrencyToCents('Not Applicable'), null)
  assert.equal(parseCurrencyToCents('20% after deductible'), null)
  assert.equal(parseCurrencyToCents(''), null)
  assert.equal(parseCurrencyToCents(null), null)
  assert.equal(parseCurrencyToCents(undefined), null)
})

test('parseCurrencyToCents handles negatives in both notations', () => {
  assert.equal(parseCurrencyToCents('-$5.00'), -500)
  assert.equal(parseCurrencyToCents('($5.00)'), -500)
})

test('formatCents renders dollars and an em dash for absent values', () => {
  assert.equal(formatCents(156443), '$1,564.43')
  assert.equal(formatCents(0), '$0.00')
  assert.equal(formatCents(null), '—')
  assert.equal(formatCents(undefined), '—')
})

test('formatCentsDelta signs the number so a zero delta is distinguishable', () => {
  assert.equal(formatCentsDelta(1234), '+$12.34')
  assert.equal(formatCentsDelta(-1234), '-$12.34')
  assert.equal(formatCentsDelta(0), '$0.00')
})
