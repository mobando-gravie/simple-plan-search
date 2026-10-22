import assert from 'node:assert/strict'
import { test } from 'node:test'
import { toCsv } from './csv'

test('toCsv writes a header and CRLF-terminated rows', () => {
  const out = toCsv(['a', 'b'], [['1', '2'], ['3', '4']])
  assert.equal(out, 'a,b\r\n1,2\r\n3,4\r\n')
})

test('toCsv quotes fields with commas, quotes or newlines and doubles embedded quotes', () => {
  const out = toCsv(['name', 'note'], [['St. Louis, MN', 'say "hi"'], ['line1\nline2', 'ok']])
  assert.equal(out, 'name,note\r\n"St. Louis, MN","say ""hi"""\r\n"line1\nline2",ok\r\n')
})

test('toCsv renders null and undefined as empty, numbers as text', () => {
  assert.equal(toCsv(['x', 'y', 'z'], [[null, undefined, 27109]]), 'x,y,z\r\n,,27109\r\n')
})
