'use client'
import { useEffect, useState } from 'react'
import { isCacheable, isFresh } from './cachePolicy'
import { idbDelete, idbGet, idbSet } from './idbCache'

export type Swr<T> = {
  data: T | null
  error: string | null
  pending: boolean
  /** Where `data` came from: the IndexedDB cache, the network, or nothing yet. */
  source: 'cache' | 'network' | null
}

const IDLE: Swr<unknown> = { data: null, error: null, pending: false, source: null }
const FETCHING: Swr<unknown> = { data: null, error: null, pending: true, source: null }

/**
 * A global GET read keyed by its url, cached in IndexedDB for 48h. Inside the window the stored copy
 * is served with no network call; past it, or on a miss, the url is fetched and (when it is a clean
 * 200) stored. The result is tagged with its url, so while a new url is in flight the hook reports
 * `pending` rather than flashing the previous url's data. A response for a url the caller has since
 * changed is dropped. Pass `null` to hold.
 */
export function useSwr<T>(url: string | null): Swr<T> {
  const [entry, setEntry] = useState<{ url: string; swr: Swr<T> } | null>(null)

  useEffect(() => {
    if (!url) return
    let active = true
    const controller = new AbortController()

    ;(async () => {
      const cached = await idbGet(url)
      if (!active) return
      if (isFresh(cached, Date.now())) {
        setEntry({ url, swr: { data: cached!.body as T, error: null, pending: false, source: 'cache' } })
        return
      }
      if (cached) void idbDelete(url)
      setEntry({ url, swr: FETCHING as Swr<T> })

      try {
        const res = await fetch(url, { signal: controller.signal })
        const body = await res.json()
        if (!active) return
        const error = res.ok && !body?.error ? null : body?.error ?? `Request failed (${res.status}).`
        if (!error && isCacheable(res.status, body, res.headers.get('cache-control'))) {
          void idbSet(url, body)
        }
        setEntry({ url, swr: { data: body as T, error, pending: false, source: 'network' } })
      } catch (e) {
        if (active && !controller.signal.aborted) {
          setEntry({ url, swr: { data: null, error: e instanceof Error ? e.message : 'Request failed.', pending: false, source: null } })
        }
      }
    })()

    return () => {
      active = false
      controller.abort()
    }
  }, [url])

  if (!url) return IDLE as Swr<T>
  // A new url whose fetch has not resolved yet reads as pending, not the old url's data.
  return entry && entry.url === url ? entry.swr : (FETCHING as Swr<T>)
}
