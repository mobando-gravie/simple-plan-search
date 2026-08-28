/** Currency helpers. Everything past the Ideon mapper is integer cents. */

/** Ideon returns decimal dollars (1564.43). Rounds HALF_UP; throws on non-finite input. */
export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) throw new Error(`not a finite dollar amount: ${dollars}`)
  return Math.round(dollars * 100)
}

export function centsToDollars(cents: number): number {
  return cents / 100
}

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—'
  return centsToDollars(cents).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/** Signed form for deltas, so a zero difference reads as $0.00 and a gain as +$1.50. */
export function formatCentsDelta(cents: number): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '-' : ''
  return sign + formatCents(Math.abs(cents))
}

/**
 * What the member pays after the ICHRA allowance. Floored at zero — an allowance
 * larger than the premium is not a refund.
 */
export function netPremiumCents(
  premiumCents: number | null,
  allowanceCents = 0,
): number | null {
  if (premiumCents === null) return null
  return Math.max(0, premiumCents - allowanceCents)
}

/**
 * Parses a currency-ish string to cents. Handles "$1,550", "1550", "12.50", "(5.00)".
 * Returns null for anything non-numeric ("Not Covered", "Included in Medical") rather
 * than coercing it to 0 — a $0 deductible is a real and different thing.
 */
export function parseCurrencyToCents(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const trimmed = raw.trim()
  if (trimmed === '') return null

  const negative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith('-')
  const digits = trimmed.replace(/[()\s$,+-]/g, '')
  if (digits === '' || !/^\d*\.?\d*$/.test(digits)) return null

  const value = Number(digits)
  if (!Number.isFinite(value)) return null
  const cents = Math.round(value * 100)
  return negative ? -cents : cents
}

/**
 * A form field's raw text to cents. Empty or non-numeric is null, not 0 — a cleared
 * "max premium" means no ceiling, which is a different thing from a $0 ceiling.
 */
export function parseDollarStringToCents(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const dollars = Number(trimmed)
  return Number.isFinite(dollars) ? Math.round(dollars * 100) : null
}

/** The inverse, for a controlled input: null renders as an empty field. */
export function centsToDollarString(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : String(centsToDollars(cents))
}
