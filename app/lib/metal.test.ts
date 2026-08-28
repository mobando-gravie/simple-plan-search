import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isMetalLevel, METAL_CODES, METAL_LEVELS } from './metal'

test('every metal level has a code and the codes are distinct', () => {
  const codes = METAL_LEVELS.map((level) => METAL_CODES[level])
  assert.equal(codes.length, METAL_LEVELS.length)
  assert.ok(codes.every(Boolean))
  assert.equal(new Set(codes).size, codes.length)
})

test('isMetalLevel rejects a level Ideon has not shipped', () => {
  assert.equal(isMetalLevel('gold'), true)
  assert.equal(isMetalLevel('expanded_bronze'), true)
  assert.equal(isMetalLevel('titanium'), false)
  assert.equal(isMetalLevel('Gold'), false)
})
