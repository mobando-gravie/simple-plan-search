import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isNpi, isRxcui, looksLikeMedIds, parseIdentifiers } from './identifiers'

test('parseIdentifiers splits on the separators a paste can arrive with', () => {
  // the backtest export's own shape — pipe with padding
  assert.deepEqual(parseIdentifiers('1629059456 | 1700805082 | 1215919063'), [
    '1629059456',
    '1700805082',
    '1215919063',
  ])
  assert.deepEqual(parseIdentifiers('748961,866083'), ['748961', '866083'])
  assert.deepEqual(parseIdentifiers('748961, 866083'), ['748961', '866083'])
  assert.deepEqual(parseIdentifiers('748961\n866083'), ['748961', '866083'])
  assert.deepEqual(parseIdentifiers('748961 866083'), ['748961', '866083'])
  assert.deepEqual(parseIdentifiers('748961 | 866083, 197659\n213469'), [
    '748961',
    '866083',
    '197659',
    '213469',
  ])
})

test('parseIdentifiers drops empties and dedupes, keeping first-seen order', () => {
  assert.deepEqual(parseIdentifiers(''), [])
  assert.deepEqual(parseIdentifiers('   '), [])
  assert.deepEqual(parseIdentifiers('|,|'), [])
  assert.deepEqual(parseIdentifiers('748961 | | 866083'), ['748961', '866083'])
  // a member row can list the same drug twice; the chip list must not
  assert.deepEqual(parseIdentifiers('748961 | 866083 | 748961'), ['748961', '866083'])
})

test('isNpi accepts exactly ten digits', () => {
  assert.equal(isNpi('1538650270'), true)
  assert.equal(isNpi('153865027'), false)
  assert.equal(isNpi('15386502701'), false)
  assert.equal(isNpi('15386502a0'), false)
  assert.equal(isNpi(''), false)
})

test('isRxcui accepts up to nine digits', () => {
  assert.equal(isRxcui('748961'), true)
  assert.equal(isRxcui('1'), true)
  assert.equal(isRxcui('123456789'), true)
  assert.equal(isRxcui('1234567890'), false)
  assert.equal(isRxcui('74896a'), false)
})

test('looksLikeMedIds fires only when every id failed', () => {
  // the trap: Rx Med IDs pasted instead of Rx RxCUI IDs — nothing resolves
  assert.equal(looksLikeMedIds(['281606', '243115'], ['281606', '243115']), true)
  // a partial failure is a bad id, not the wrong column
  assert.equal(looksLikeMedIds(['748961', '243115'], ['243115']), false)
  assert.equal(looksLikeMedIds(['748961'], []), false)
  assert.equal(looksLikeMedIds([], []), false)
})
