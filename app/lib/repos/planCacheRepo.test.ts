import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cacheKeyFor } from './planCacheRepo'

test('key order does not change the key', () => {
  assert.equal(
    cacheKeyFor({ zip_code: '75201', market: 'individual' }),
    cacheKeyFor({ market: 'individual', zip_code: '75201' }),
  )
})

test('nested key order does not change the key either', () => {
  assert.equal(
    cacheKeyFor({ applicants: [{ age: 40, smoker: false }] }),
    cacheKeyFor({ applicants: [{ smoker: false, age: 40 }] }),
  )
})

test('a different applicant age is a different key', () => {
  // Regression: JSON.stringify's array replacer is a recursive allowlist, so
  // nested `age` was stripped and every household of a given size shared a row.
  assert.notEqual(
    cacheKeyFor({ zip_code: '75201', applicants: [{ age: 40, smoker: false, child: false }] }),
    cacheKeyFor({ zip_code: '75201', applicants: [{ age: 25, smoker: false, child: false }] }),
  )
})

test('a different tobacco flag is a different key', () => {
  assert.notEqual(
    cacheKeyFor({ applicants: [{ age: 40, smoker: false, child: false }] }),
    cacheKeyFor({ applicants: [{ age: 40, smoker: true, child: false }] }),
  )
})

test('a different drug package is a different key', () => {
  assert.notEqual(
    cacheKeyFor({ zip_code: '75201', drug_packages: [{ id: '54569-5382-00' }] }),
    cacheKeyFor({ zip_code: '75201', drug_packages: [{ id: '60687-0143-01' }] }),
  )
})

test('a different provider is a different key', () => {
  assert.notEqual(
    cacheKeyFor({ zip_code: '75201', providers: [{ npi: 1 }] }),
    cacheKeyFor({ zip_code: '75201', providers: [{ npi: 2 }] }),
  )
})

test('applicant order is significant — Ideon echoes applicants back positionally', () => {
  assert.notEqual(
    cacheKeyFor({ applicants: [{ age: 40 }, { age: 8 }] }),
    cacheKeyFor({ applicants: [{ age: 8 }, { age: 40 }] }),
  )
})

test('an identical request still hits the same row', () => {
  const request = {
    zip_code: '75201',
    applicants: [{ age: 40, smoker: false, child: false }],
    drug_packages: [{ id: 'X' }],
  }
  assert.equal(cacheKeyFor(request), cacheKeyFor(structuredClone(request)))
})
