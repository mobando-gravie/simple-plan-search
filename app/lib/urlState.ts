import { firstOfNextMonth } from './dates'
import type { Household } from './household'
import type { SelectedDrug, SelectedProvider } from './ideon/types'
import { centsToDollars, dollarsToCents } from './money'
import { DEFAULT_FILTERS, type PlanFilterState, type SortKey } from './planFilter'
import { DEFAULT_CRITERIA, type SearchCriteria } from './services/planSearch'

/**
 * The whole app state as it travels in a query string. Short keys and codes, but
 * the real saving is that anything sitting at its default is simply absent.
 */
export type UrlState = {
  /** null when the URL carries no runnable search. */
  criteria: SearchCriteria | null
  filters: PlanFilterState
  openPlanId: string | null
}

/** Next hands a page `Record<string, string | string[]>`; the client has the real thing. */
export type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>

const MAX_AGE = 120

// URLSearchParams percent-encodes everything outside [A-Za-z0-9*-._], so a comma
// would cost three characters. `.` separates list items, `_` fields within one.
const LIST = '.'
const FIELD = '_'

const METAL_CODES: Record<string, string> = {
  bronze: 'b',
  expanded_bronze: 'eb',
  silver: 's',
  gold: 'g',
  platinum: 'p',
  catastrophic: 'c',
}

const SORT_CODES: Record<SortKey, string> = {
  'premium-asc': 'pa',
  'premium-desc': 'pd',
  'deductible-asc': 'da',
  'deductible-desc': 'dd',
  'oopMax-asc': 'oa',
  'oopMax-desc': 'od',
  name: 'nm',
  'free-floor': 'ff',
}

function invert(codes: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(codes).map(([full, code]) => [code, full]))
}

const METAL_FROM_CODE = invert(METAL_CODES)
const SORT_FROM_CODE = invert(SORT_CODES)

/** An unrecognised value round-trips as itself — a new Ideon metal level must not vanish. */
function toCode(codes: Record<string, string>, value: string): string {
  return codes[value] ?? value.toLowerCase()
}

function fromCode(byCode: Record<string, string>, code: string): string {
  return byCode[code] ?? code
}

// ---------------------------------------------------------------- reading

function params(input: SearchParamsInput): URLSearchParams {
  if (input instanceof URLSearchParams) return input
  const out = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) value.forEach((v) => out.append(key, v))
    else if (value !== undefined) out.append(key, value)
  }
  return out
}

function list(raw: string | null): string[] {
  if (!raw) return []
  return raw.split(LIST).filter((part) => part !== '')
}

/** null for anything that is not a whole age in range, so a junk URL degrades quietly. */
function age(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 && n <= MAX_AGE ? n : null
}

function positiveNumber(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

function dollarsToCentsOrNull(raw: string | null): number | null {
  const dollars = positiveNumber(raw)
  return dollars === undefined ? null : dollarsToCents(dollars)
}

/** `40t` → age 40, tobacco. The suffix is one character where a second param would be five. */
function adult(raw: string | undefined): { age: number; tobacco: boolean } | null {
  if (raw === undefined) return null
  const tobacco = raw.endsWith('t')
  const parsed = age(tobacco ? raw.slice(0, -1) : raw)
  return parsed === null ? null : { age: parsed, tobacco }
}

function decodeProviders(raw: string | null): SelectedProvider[] {
  return list(raw)
    .map((npi) => Number(npi))
    .filter((npi) => Number.isInteger(npi) && npi > 0)
    .map((npi) => ({ npi, name: String(npi) }))
}

/** medId is the selection key, the NDC drives the coverage query — both load-bearing. */
function decodeDrugs(raw: string | null): SelectedDrug[] {
  const out: SelectedDrug[] = []
  for (const item of list(raw)) {
    const [medIdRaw, ndc] = item.split(FIELD)
    const medId = Number(medIdRaw)
    if (!Number.isInteger(medId) || medId <= 0 || !ndc) continue
    out.push({ medId, ndc, name: ndc })
  }
  return out
}

function decodeCriteria(p: URLSearchParams): SearchCriteria | null {
  const zipCode = (p.get('z') ?? '').trim()
  if (!/^\d{5}$/.test(zipCode)) return null

  const adults = list(p.get('a'))
  const member = adult(adults[0])
  if (!member) return null

  const household: Household = {
    member,
    spouse: adult(adults[1]),
    children: list(p.get('k'))
      .map((raw) => age(raw))
      .filter((value): value is number => value !== null)
      .map((value) => ({ age: value })),
  }

  const allowanceCents = dollarsToCentsOrNull(p.get('w'))
  const enrollmentDate = (p.get('d') ?? '').trim()

  return {
    ...DEFAULT_CRITERIA,
    zipCode,
    household,
    householdIncome: positiveNumber(p.get('i')),
    allowanceCents: allowanceCents ?? undefined,
    enrollmentDate: /^\d{4}-\d{2}-\d{2}$/.test(enrollmentDate) ? enrollmentDate : undefined,
    providers: decodeProviders(p.get('p')),
    drugs: decodeDrugs(p.get('x')),
  }
}

function decodeFilters(p: URLSearchParams): PlanFilterState {
  const sortCode = p.get('o')
  const sort = sortCode ? fromCode(SORT_FROM_CODE, sortCode) : DEFAULT_FILTERS.sort
  return {
    search: p.get('q') ?? DEFAULT_FILTERS.search,
    metalLevels: list(p.get('f')).map((code) => fromCode(METAL_FROM_CODE, code)),
    planTypes: list(p.get('t')),
    carriers: p.getAll('r').filter((name) => name !== ''),
    hsaOnly: p.get('hsa') === '1',
    maxPremiumCents: dollarsToCentsOrNull(p.get('mp')),
    maxDeductibleCents: dollarsToCentsOrNull(p.get('md')),
    coversAllDrugs: p.get('cd') === '1',
    allProvidersInNetwork: p.get('pn') === '1',
    sort: sort as SortKey,
  }
}

/** Never throws. A rotted link degrades to an empty form, not a stack trace. */
export function decodeUrlState(input: SearchParamsInput): UrlState {
  const p = params(input)
  return {
    criteria: decodeCriteria(p),
    filters: decodeFilters(p),
    openPlanId: p.get('v') || null,
  }
}

// ---------------------------------------------------------------- writing

/** Empty means absent — the one rule that keeps a default from reaching the URL. */
function put(p: URLSearchParams, key: string, value: string) {
  if (value) p.set(key, value)
  else p.delete(key)
}

function encodeAdult(a: { age: number; tobacco: boolean }): string {
  return `${a.age}${a.tobacco ? 't' : ''}`
}

/** Search params only. A new search deliberately drops the previous filters. */
export function encodeCriteria(criteria: SearchCriteria): URLSearchParams {
  const p = new URLSearchParams()
  p.set('z', criteria.zipCode)

  const { member, spouse, children } = criteria.household
  const adults = [encodeAdult(member)]
  if (spouse) adults.push(encodeAdult(spouse))
  p.set('a', adults.join(LIST))

  if (children.length > 0) p.set('k', children.map((c) => c.age).join(LIST))
  if (criteria.householdIncome !== undefined) p.set('i', String(criteria.householdIncome))
  if (criteria.allowanceCents) p.set('w', String(centsToDollars(criteria.allowanceCents)))
  // The default is time-dependent, so omitting it re-anchors a link shared across a
  // month boundary. Pinning it is the caller's choice, made in the form.
  if (criteria.enrollmentDate && criteria.enrollmentDate !== firstOfNextMonth()) {
    p.set('d', criteria.enrollmentDate)
  }
  if (criteria.providers.length > 0) {
    p.set('p', criteria.providers.map((provider) => provider.npi).join(LIST))
  }
  if (criteria.drugs.length > 0) {
    p.set('x', criteria.drugs.map((drug) => `${drug.medId}${FIELD}${drug.ndc}`).join(LIST))
  }
  return p
}

const centsParam = (cents: number | null) => (cents === null ? '' : String(centsToDollars(cents)))

/** Merges the view onto existing params, clearing any key that fell back to its default. */
export function encodeView(
  base: URLSearchParams,
  filters: PlanFilterState,
  openPlanId: string | null,
): URLSearchParams {
  const p = new URLSearchParams(base)

  put(p, 'q', filters.search.trim())
  put(p, 'f', filters.metalLevels.map((m) => toCode(METAL_CODES, m)).join(LIST))
  put(p, 't', filters.planTypes.map((v) => v.toLowerCase()).join(LIST))
  put(p, 'mp', centsParam(filters.maxPremiumCents))
  put(p, 'md', centsParam(filters.maxDeductibleCents))
  put(p, 'hsa', filters.hsaOnly ? '1' : '')
  put(p, 'cd', filters.coversAllDrugs ? '1' : '')
  put(p, 'pn', filters.allProvidersInNetwork ? '1' : '')
  put(p, 'o', filters.sort === DEFAULT_FILTERS.sort ? '' : toCode(SORT_CODES, filters.sort))
  put(p, 'v', openPlanId ?? '')

  // Carrier names contain dots ("U.S. Health"), so a joined list would be ambiguous.
  p.delete('r')
  for (const carrier of filters.carriers) p.append('r', carrier)

  return p
}

export function isDefaultFilters(filters: PlanFilterState): boolean {
  return encodeView(new URLSearchParams(), filters, null).toString() === ''
}
