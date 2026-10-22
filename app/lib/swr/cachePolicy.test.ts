import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isCacheable, isFresh, SWR_TTL_MS } from './cachePolicy'

test('isFresh is true inside the 48h window and false at or past it', () => {
  const now = 1_000_000_000_000
  assert.equal(isFresh(null, now), false)
  assert.equal(isFresh({ body: {}, storedAt: now }, now), true)
  assert.equal(isFresh({ body: {}, storedAt: now - (SWR_TTL_MS - 1) }, now), true)
  assert.equal(isFresh({ body: {}, storedAt: now - SWR_TTL_MS }, now), false) // boundary = expired
  assert.equal(isFresh({ body: {}, storedAt: now - SWR_TTL_MS - 1 }, now), false)
})

test('isCacheable stores only a clean 200', () => {
  assert.equal(isCacheable(200, { hits: [] }, null), true)
  assert.equal(isCacheable(200, { ratingArea: {} }, 'private, no-cache'), true)
})

test('isCacheable rejects non-200, error bodies and no-store', () => {
  assert.equal(isCacheable(404, { error: 'nope' }, null), false)
  assert.equal(isCacheable(502, { error: 'down', retryable: true }, null), false)
  assert.equal(isCacheable(200, { hits: [], error: 'temporary' }, null), false)
  assert.equal(isCacheable(200, { ok: true }, 'no-store'), false)
  assert.equal(isCacheable(200, { ok: true }, 'public, s-maxage=1, NO-STORE'), false)
})
