import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  centsToDollarString,
  dollarsToCents,
  formatCents,
  formatCentsDelta,
  netPremiumCents,
  parseCurrencyToCents,
  parseDollarStringToCents,
} from './money'

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

test('the net premium subtracts the allowance', () => {
  assert.equal(netPremiumCents(50000, 40000), 10000)
  assert.equal(netPremiumCents(50000, 0), 50000)
  assert.equal(netPremiumCents(50000), 50000)
})

test('an allowance larger than the premium floors at zero, not a refund', () => {
  assert.equal(netPremiumCents(30000, 40000), 0)
  assert.equal(netPremiumCents(40000, 40000), 0)
})

test('an unpriced premium stays unpriced whatever the allowance', () => {
  assert.equal(netPremiumCents(null, 40000), null)
  assert.equal(netPremiumCents(null), null)
})

test('parseDollarStringToCents reads a form field, empty and junk as null', () => {
  assert.equal(parseDollarStringToCents('800'), 80000)
  assert.equal(parseDollarStringToCents('12.50'), 1250)
  assert.equal(parseDollarStringToCents(' 400 '), 40000)
  assert.equal(parseDollarStringToCents('-5'), -500)
  // null is "no ceiling", which is not the same thing as a $0 ceiling.
  assert.equal(parseDollarStringToCents(''), null)
  assert.equal(parseDollarStringToCents('   '), null)
  assert.equal(parseDollarStringToCents('abc'), null)
})

test('centsToDollarString round-trips a controlled input, null as empty', () => {
  assert.equal(centsToDollarString(80000), '800')
  assert.equal(centsToDollarString(1250), '12.5')
  assert.equal(centsToDollarString(0), '0')
  assert.equal(centsToDollarString(null), '')
  assert.equal(centsToDollarString(undefined), '')
})
