import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isValidApiToken, parseApiTokens, presentedToken } from './apiToken'

test('parseApiTokens splits, trims and drops blanks', () => {
  assert.deepEqual(parseApiTokens(' alpha , beta ,, '), ['alpha', 'beta'])
  assert.deepEqual(parseApiTokens(undefined), [])
  assert.deepEqual(parseApiTokens(''), [])
})

test('isValidApiToken matches an exact token only', () => {
  const tokens = parseApiTokens('alpha,beta')
  assert.equal(isValidApiToken('alpha', tokens), true)
  assert.equal(isValidApiToken('beta', tokens), true)
  assert.equal(isValidApiToken('alph', tokens), false)
  assert.equal(isValidApiToken('alphax', tokens), false)
  assert.equal(isValidApiToken('ALPHA', tokens), false)
})

test('no configured tokens rejects everything rather than opening the door', () => {
  assert.equal(isValidApiToken('alpha', []), false)
  assert.equal(isValidApiToken(null, parseApiTokens('alpha')), false)
})

test('presentedToken reads Bearer, then X-Api-Key', () => {
  assert.equal(presentedToken(new Headers({ authorization: 'Bearer  secret ' })), 'secret')
  assert.equal(presentedToken(new Headers({ authorization: 'bearer secret' })), 'secret')
  assert.equal(presentedToken(new Headers({ 'x-api-key': 'secret' })), 'secret')
  assert.equal(presentedToken(new Headers({ authorization: 'Basic secret' })), null)
  assert.equal(presentedToken(new Headers()), null)
})
