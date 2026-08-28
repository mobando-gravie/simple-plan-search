import { test } from 'node:test'
import assert from 'node:assert/strict'
import { errorMessage } from './errors'

test('errorMessage unwraps an Error and falls back for anything else', () => {
  assert.equal(errorMessage(new Error('Ideon said 502'), 'nope'), 'Ideon said 502')
  assert.equal(errorMessage(new TypeError('bad input'), 'nope'), 'bad input')
  assert.equal(errorMessage('a thrown string', 'nope'), 'nope')
  assert.equal(errorMessage(undefined, 'nope'), 'nope')
  assert.equal(errorMessage({ message: 'looks like one' }, 'nope'), 'nope')
})
