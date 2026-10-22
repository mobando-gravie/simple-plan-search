/**
 * The four shareable rating-area lookups, as readable URL params: ?area=MN07, ?zip=55901,
 * ?county=27109, ?state=MN. The param key is the mode name. Pure, so the server page can parse an
 * incoming URL and the client can encode one with the same vocabulary.
 */

export type Mode = 'area' | 'zip' | 'county' | 'state'
export type Lookup = { mode: Mode; value: string }

/** Precedence when a link carries several; the first non-empty one wins. */
const MODES: Mode[] = ['area', 'zip', 'county', 'state']

type SearchParams = Record<string, string | string[] | undefined>

export function parseLookup(sp: SearchParams): Lookup | null {
  for (const mode of MODES) {
    const raw = sp[mode]
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim()
    if (value) return { mode, value }
  }
  return null
}

export function lookupQuery(mode: Mode, value: string): string {
  return `${mode}=${encodeURIComponent(value.trim())}`
}
