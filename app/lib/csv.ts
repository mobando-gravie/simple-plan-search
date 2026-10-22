/** A CSV cell value; null/undefined render as empty. */
type Cell = string | number | null | undefined

/** RFC-4180: quote a field holding a comma, quote, CR or LF; double any embedded quote. */
function escape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  const render = (row: Cell[]) => row.map((c) => escape(c == null ? '' : String(c))).join(',')
  return [headers.join(','), ...rows.map(render)].join('\r\n') + '\r\n'
}
