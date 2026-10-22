/** The client cache keeps a response for this long; past it, the entry is refetched. */
export const SWR_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

export type Entry = { body: unknown; storedAt: number }

/** Fresh-window policy: a stored entry is served without a network call until it is 48h old. */
export function isFresh(entry: Entry | null, now: number): boolean {
  return entry !== null && now - entry.storedAt < SWR_TTL_MS
}

/** Only a clean 200 is worth storing — never an error body, never a no-store response. */
export function isCacheable(status: number, body: unknown, cacheControl: string | null): boolean {
  if (status !== 200) return false
  if (cacheControl?.toLowerCase().includes('no-store')) return false
  if (body !== null && typeof body === 'object' && 'error' in body) return false
  return true
}
