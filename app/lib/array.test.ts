import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addUnique, toggle } from './array'

test('toggle adds a value that is absent and removes one that is present', () => {
  assert.deepEqual(toggle(['gold'], 'silver'), ['gold', 'silver'])
  assert.deepEqual(toggle(['gold', 'silver'], 'gold'), ['silver'])
  assert.deepEqual(toggle([], 'gold'), ['gold'])
})

test('toggle does not mutate its input', () => {
  const values = ['gold']
  toggle(values, 'silver')
  assert.deepEqual(values, ['gold'])
})

test('addUnique appends by key and returns the same array when the key is taken', () => {
  const rows = [{ npi: 1, name: 'A' }]
  const keyOf = (r: { npi: number }) => String(r.npi)

  assert.deepEqual(addUnique(rows, { npi: 2, name: 'B' }, keyOf), [
    { npi: 1, name: 'A' },
    { npi: 2, name: 'B' },
  ])
  // Same reference, so a re-add cannot trigger a re-render.
  assert.equal(addUnique(rows, { npi: 1, name: 'A renamed' }, keyOf), rows)
})
