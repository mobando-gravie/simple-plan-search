import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DETAIL_TTL_SECONDS, edgeCache, NO_STORE } from './cacheHeaders'

test('edgeCache sets the edge TTL and keeps the client private', () => {
  const h = edgeCache(3600, 86_400)
  assert.equal(h['CDN-Cache-Control'], 'public, s-maxage=3600, stale-while-revalidate=86400')
  assert.equal(h['Cache-Control'], 'private, no-cache')
})

test('edgeCache floors fractional seconds', () => {
  const h = edgeCache(3599.9, 100.9)
  assert.equal(h['CDN-Cache-Control'], 'public, s-maxage=3599, stale-while-revalidate=100')
})

test('edgeCache clamps a spent TTL to zero rather than going negative', () => {
  // ttl - age when the row is already past its TTL.
  const h = edgeCache(86_400 - 90_000, 86_400)
  assert.equal(h['CDN-Cache-Control'], 'public, s-maxage=0, stale-while-revalidate=86400')
})

test('NO_STORE forbids caching at both layers', () => {
  assert.equal(NO_STORE['Cache-Control'], 'no-store')
  assert.equal(NO_STORE['CDN-Cache-Control'], 'no-store')
})

test('DETAIL_TTL_SECONDS is seven days', () => {
  assert.equal(DETAIL_TTL_SECONDS, 7 * 24 * 60 * 60)
})
