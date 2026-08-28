import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plural } from './text'

test('plural agrees only on exactly one', () => {
  assert.equal(plural(1, 'child', 'children'), 'child')
  assert.equal(plural(0, 'child', 'children'), 'children')
  assert.equal(plural(2, 'child', 'children'), 'children')
})
