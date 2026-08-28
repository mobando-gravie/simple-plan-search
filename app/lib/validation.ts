export const ZIP_PATTERN = /^\d{5}$/

export function isZipCode(raw: string | null | undefined): boolean {
  return ZIP_PATTERN.test((raw ?? '').trim())
}

/** Below this the typeahead does not search — the client and both routes agree on it. */
export const MIN_SEARCH_TERM = 3
