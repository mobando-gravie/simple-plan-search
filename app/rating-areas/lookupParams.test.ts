import assert from 'node:assert/strict'
import { test } from 'node:test'
import { lookupQuery, parseLookup } from './lookupParams'

test('parseLookup reads each lookup param', () => {
  assert.deepEqual(parseLookup({ area: 'MN07' }), { mode: 'area', value: 'MN07' })
  assert.deepEqual(parseLookup({ zip: '55901' }), { mode: 'zip', value: '55901' })
  assert.deepEqual(parseLookup({ county: '27109' }), { mode: 'county', value: '27109' })
  assert.deepEqual(parseLookup({ state: 'MN' }), { mode: 'state', value: 'MN' })
})

test('parseLookup applies area > zip > county > state precedence', () => {
  assert.deepEqual(parseLookup({ zip: '55901', area: 'MN07' }), { mode: 'area', value: 'MN07' })
  assert.deepEqual(parseLookup({ state: 'MN', county: '27109' }), { mode: 'county', value: '27109' })
})

test('parseLookup trims, takes the first of a repeated param, and ignores empties', () => {
  assert.deepEqual(parseLookup({ area: '  MN07 ' }), { mode: 'area', value: 'MN07' })
  assert.deepEqual(parseLookup({ area: ['MN07', 'CA01'] }), { mode: 'area', value: 'MN07' })
  assert.deepEqual(parseLookup({ area: '', zip: '55901' }), { mode: 'zip', value: '55901' })
})

test('parseLookup returns null with no usable param', () => {
  assert.equal(parseLookup({}), null)
  assert.equal(parseLookup({ area: '   ', foo: 'bar' }), null)
})

test('lookupQuery encodes mode=value, trimmed and URL-safe', () => {
  assert.equal(lookupQuery('area', 'MN07'), 'area=MN07')
  assert.equal(lookupQuery('state', ' mn '), 'state=mn')
  assert.equal(lookupQuery('area', 'a b'), 'area=a%20b')
})
