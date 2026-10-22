import type { Entry } from './cachePolicy'

/**
 * A tiny IndexedDB key→response store for the client SWR cache. Every call is wrapped so a private
 * window, a disabled store, or a blocked upgrade degrades to "no cache" rather than throwing into
 * React — the hook then just fetches. Keyed by the full request URL.
 */

const DB_NAME = 'sps-swr'
const STORE = 'responses'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'url' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
  })
  // A rejected open must not be cached, or every later call reuses the failure.
  dbPromise.catch(() => { dbPromise = null })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

export async function idbGet(url: string): Promise<Entry | null> {
  try {
    const row = await tx<{ url: string; body: unknown; storedAt: number } | undefined>(
      'readonly',
      (s) => s.get(url),
    )
    return row ? { body: row.body, storedAt: row.storedAt } : null
  } catch {
    return null
  }
}

export async function idbSet(url: string, body: unknown): Promise<void> {
  try {
    await tx('readwrite', (s) => s.put({ url, body, storedAt: Date.now() }))
  } catch {
    // Cache writes are best-effort; a failure just means the next read is a miss.
  }
}

export async function idbDelete(url: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(url))
  } catch {
    // Ignore — a stale row that cannot be deleted is re-evaluated on the next read.
  }
}
