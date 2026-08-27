import { parseCurrencyToCents } from './money'

export type ParsedModifierRow = {
  hiosPlanId: string | null
  carrierId: string | null
  state: string | null
  ratingArea: string | null
  metalLevel: string | null
  effectiveYear: number | null
  multiplier: number
  flatCents: number
  label: string | null
}

export type ParseResult = {
  rows: ParsedModifierRow[]
  errors: { line: number; message: string }[]
  unmappedColumns: string[]
}

/**
 * Header aliases. The real Gravie MySQL export header is not settled yet, so each
 * field accepts the plausible spellings; normalization strips case, spaces and
 * underscores, making snake_case, camelCase and "Title Case" all equivalent.
 */
const ALIASES: Record<keyof ParsedModifierRow, string[]> = {
  hiosPlanId: ['hiosplanid', 'hiosid', 'planid', 'hios', 'externalplanid', 'hiosplanidentifier'],
  carrierId: ['carrierid', 'carrier', 'issuerid', 'hiosissuerid', 'carriercode'],
  state: ['state', 'statecode', 'stateabbr', 'stateabbreviation'],
  ratingArea: ['ratingarea', 'ratingareaid', 'ratingareacode', 'area'],
  metalLevel: ['metallevel', 'metal', 'level', 'metaltier', 'tier'],
  effectiveYear: ['effectiveyear', 'year', 'planyear', 'benefityear', 'coverageyear'],
  multiplier: ['multiplier', 'factor', 'ratefactor', 'premiumfactor', 'load', 'loadfactor'],
  flatCents: ['flatcents', 'flat', 'flatamount', 'flatadjustment', 'adjustmentcents', 'addon'],
  label: ['label', 'note', 'notes', 'description', 'comment', 'reason'],
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]/g, '')
}

/** RFC-4180-ish: honours quoted fields, doubled quotes, and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function blankToNull(v: string | undefined): string | null {
  const t = (v ?? '').trim()
  return t === '' ? null : t
}

/**
 * `flat_cents` accepts either integer cents or a dollar string, because a MySQL
 * export of a dollar-denominated column is the likelier real-world shape. A value
 * containing `$` or a decimal point is read as dollars; a bare integer as cents.
 */
function parseFlat(raw: string | null, line: number, errors: ParseResult['errors']): number {
  if (raw === null) return 0
  const looksLikeDollars = raw.includes('$') || raw.includes('.')
  const cents = looksLikeDollars ? parseCurrencyToCents(raw) : Number(raw.replace(/[\s,]/g, ''))
  if (cents === null || !Number.isFinite(cents)) {
    errors.push({ line, message: `flat amount is not a number: "${raw}"` })
    return 0
  }
  return Math.round(cents)
}

export function parseModifierCsv(text: string): ParseResult {
  const errors: ParseResult['errors'] = []
  const table = parseCsv(text)
  if (table.length === 0) {
    return { rows: [], errors: [{ line: 0, message: 'file is empty' }], unmappedColumns: [] }
  }

  const header = table[0].map(normalizeHeader)
  const columnOf: Partial<Record<keyof ParsedModifierRow, number>> = {}
  const claimed = new Set<number>()
  for (const [field, aliases] of Object.entries(ALIASES) as [keyof ParsedModifierRow, string[]][]) {
    const index = header.findIndex((h) => aliases.includes(h))
    if (index >= 0) {
      columnOf[field] = index
      claimed.add(index)
    }
  }

  const unmappedColumns = table[0].filter((_, i) => !claimed.has(i) && header[i] !== '')

  if (columnOf.multiplier === undefined && columnOf.flatCents === undefined) {
    errors.push({
      line: 1,
      message: 'header has neither a multiplier nor a flat-amount column — nothing to apply',
    })
    return { rows: [], errors, unmappedColumns }
  }

  const cell = (r: string[], field: keyof ParsedModifierRow) => {
    const i = columnOf[field]
    return i === undefined ? null : blankToNull(r[i])
  }

  const rows: ParsedModifierRow[] = []
  for (let r = 1; r < table.length; r++) {
    const line = r + 1
    const raw = table[r]

    const multiplierRaw = cell(raw, 'multiplier')
    let multiplier = 1
    if (multiplierRaw !== null) {
      const parsed = Number(multiplierRaw.replace(/[%\s,]/g, ''))
      // A "3.5" in a column of percents would be indistinguishable from a 3.5x factor,
      // so only an explicit % sign triggers the percent reading.
      multiplier = multiplierRaw.includes('%') ? 1 + parsed / 100 : parsed
      if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier >= 10) {
        errors.push({ line, message: `multiplier out of range (0, 10): "${multiplierRaw}"` })
        continue
      }
    }

    const yearRaw = cell(raw, 'effectiveYear')
    let effectiveYear: number | null = null
    if (yearRaw !== null) {
      effectiveYear = Number(yearRaw)
      if (!Number.isInteger(effectiveYear)) {
        errors.push({ line, message: `effective year is not an integer: "${yearRaw}"` })
        continue
      }
    }

    rows.push({
      hiosPlanId: cell(raw, 'hiosPlanId'),
      carrierId: cell(raw, 'carrierId'),
      state: cell(raw, 'state')?.toUpperCase() ?? null,
      ratingArea: cell(raw, 'ratingArea'),
      metalLevel: cell(raw, 'metalLevel')?.toLowerCase() ?? null,
      effectiveYear,
      multiplier,
      flatCents: parseFlat(cell(raw, 'flatCents'), line, errors),
      label: cell(raw, 'label'),
    })
  }

  return { rows, errors, unmappedColumns }
}
