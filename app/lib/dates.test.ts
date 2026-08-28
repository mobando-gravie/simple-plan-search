import { test } from 'node:test'
import assert from 'node:assert/strict'
import { firstOfNextMonth } from './dates'

test('returns the first of the following month', () => {
  assert.equal(firstOfNextMonth(new Date(2026, 7, 27)), '2026-09-01')
  assert.equal(firstOfNextMonth(new Date(2026, 0, 15)), '2026-02-01')
})

test('rolls the year over from December', () => {
  assert.equal(firstOfNextMonth(new Date(2026, 11, 31)), '2027-01-01')
})

test('the month is zero-padded', () => {
  assert.equal(firstOfNextMonth(new Date(2026, 8, 1)), '2026-10-01')
  assert.equal(firstOfNextMonth(new Date(2026, 0, 1)), '2026-02-01')
})

test('the last instant of a month still resolves to the next one, not the one after', () => {
  // Late on the 31st, UTC has already rolled over; using UTC parts would return
  // October here instead of September.
  assert.equal(firstOfNextMonth(new Date(2026, 7, 31, 23, 59)), '2026-09-01')
})

test('a 31-day month rolling into a 30-day month does not overflow', () => {
  assert.equal(firstOfNextMonth(new Date(2026, 2, 31)), '2026-04-01')
})
