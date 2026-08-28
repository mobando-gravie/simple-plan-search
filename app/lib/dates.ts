/**
 * ACA coverage begins on the first of a month, so the next available effective
 * date is the first of next month. Local date parts, not UTC: at 7pm on 31 August
 * in US Central, UTC is already September and would return October.
 */
export function firstOfNextMonth(today: Date = new Date()): string {
  const next = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const month = String(next.getMonth() + 1).padStart(2, '0')
  return `${next.getFullYear()}-${month}-01`
}

/** `2026-08-28 14:05` — a sortable stamp for admin tables, no locale surprises. */
export function formatTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 16)
}

export function minutesAgo(seconds: number): number {
  return Math.round(seconds / 60)
}
