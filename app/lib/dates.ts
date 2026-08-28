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
