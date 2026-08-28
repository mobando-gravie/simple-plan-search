/**
 * Pasted identifier lists. The backtest exports separate ids with " | ", but a
 * hand-assembled paste may use commas, newlines or plain spaces, so all four are
 * accepted rather than asking which one the source happened to use.
 */
export function parseIdentifiers(raw: string): string[] {
  const seen = new Set<string>()
  for (const token of raw.split(/[,|\s]+/)) {
    const trimmed = token.trim()
    if (trimmed !== '') seen.add(trimmed)
  }
  return [...seen]
}

/** Ten digits, as the backtest loader validates them. */
export function isNpi(value: string): boolean {
  return /^\d{10}$/.test(value)
}

export function isRxcui(value: string): boolean {
  return /^\d{1,9}$/.test(value)
}

/**
 * A med_id and an rxcui are both bare integers, so a paste of the wrong CSV column
 * is only detectable after every id fails to resolve.
 */
export function looksLikeMedIds(ids: string[], unresolved: string[]): boolean {
  return ids.length > 0 && unresolved.length === ids.length && ids.every(isRxcui)
}
