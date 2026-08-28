import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isZipCode } from './validation'

test('isZipCode accepts exactly five digits, trimming whitespace', () => {
  assert.equal(isZipCode('11201'), true)
  assert.equal(isZipCode('  11201 '), true)
  assert.equal(isZipCode('00501'), true)
})

test('isZipCode rejects ZIP+4, short codes and non-digits', () => {
  assert.equal(isZipCode('11201-1234'), false)
  assert.equal(isZipCode('1120'), false)
  assert.equal(isZipCode('112011'), false)
  assert.equal(isZipCode('abcde'), false)
  assert.equal(isZipCode(''), false)
  assert.equal(isZipCode(null), false)
  assert.equal(isZipCode(undefined), false)
})
