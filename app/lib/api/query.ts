import { isMetalLevel, METAL_LEVELS } from '../metal'
import { isSortKey, SORT_KEYS, type PlanFilterState } from '../planFilter'
import { decodeUrlState } from '../urlState'
import { DEFAULT_CRITERIA, type SearchCriteria } from '../services/planSearch'

/**
 * Readable parameter names for agents, normalised onto the query-string codec the
 * UI already uses. The short keys still work, so a URL copied out of the browser
 * runs against the API by swapping `/` for `/api/plans`.
 */

export type ApiView = 'summary' | 'full'

export type ApiQuery = {
  criteria: SearchCriteria
  filters: PlanFilterState
  view: ApiView
  refresh: boolean
  limit: number
}

export type QueryFailure = { error: string; hint: string }

/** A search pulls 200 plans; `limit` trims that answer, it never shrinks the search. */
export const MAX_LIMIT = 200

/** Long list names, and the codec key each one feeds. */
const LIST_KEYS: Record<string, string> = {
  child_ages: 'k',
  providers: 'p',
  drugs: 'x',
  metals: 'f',
  plan_types: 't',
}

const SCALAR_KEYS: Record<string, string> = {
  zip: 'z',
  income: 'i',
  allowance: 'w',
  enrollment_date: 'd',
  max_premium: 'mp',
  max_deductible: 'md',
  sort: 'o',
}

const COVERAGE_KEYS: Record<string, string> = {
  provider_coverage: 'pn',
  drug_coverage: 'cd',
}

const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

function flag(params: URLSearchParams, name: string): boolean {
  const raw = params.get(name)
  return raw !== null && (raw === '' || TRUTHY.has(raw.toLowerCase()))
}

/** `all` covers every selection, `any` covers at least one — the codec's `1` and `p`. */
function coverageCode(raw: string): string | null {
  const value = raw.trim().toLowerCase()
  if (value === 'all' || value === 'match' || value === '1') return '1'
  if (value === 'any' || value === 'partial' || value === 'p') return 'p'
  return null
}

/** Agents write commas; the codec separates list items on `.`. */
function toListValue(raw: string): string {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join('.')
}

function adultCode(age: string | null, tobacco: boolean): string | null {
  if (age === null || age.trim() === '') return null
  return `${age.trim()}${tobacco ? 't' : ''}`
}

/** Long names win over a short key carrying the same thing. */
function normalise(params: URLSearchParams): URLSearchParams | QueryFailure {
  const out = new URLSearchParams(params)

  for (const [long, short] of Object.entries(SCALAR_KEYS)) {
    const raw = params.get(long)
    if (raw !== null && raw.trim() !== '') out.set(short, raw.trim())
  }
  for (const [long, short] of Object.entries(LIST_KEYS)) {
    const raw = params.get(long)
    if (raw !== null) out.set(short, toListValue(raw))
  }
  for (const [long, short] of Object.entries(COVERAGE_KEYS)) {
    const raw = params.get(long)
    if (raw === null) continue
    const code = coverageCode(raw)
    if (code === null) {
      return { error: `${long} must be "all" or "any".`, hint: `Got "${raw}".` }
    }
    out.set(short, code)
  }

  const explicit = (params.get('a') ?? '').split('.').filter((part) => part !== '')
  const member =
    adultCode(params.get('age') ?? params.get('member_age'), flag(params, 'member_tobacco')) ??
    explicit[0] ??
    String(DEFAULT_CRITERIA.household.member.age)
  const spouse =
    adultCode(params.get('spouse_age'), flag(params, 'spouse_tobacco')) ?? explicit[1] ?? null
  out.set('a', spouse ? `${member}.${spouse}` : member)

  if (params.has('hsa_only')) out.set('hsa', flag(params, 'hsa_only') ? '1' : '')
  // Carrier names contain dots, so they repeat the parameter rather than joining.
  const carriers = params.getAll('carriers').filter((name) => name.trim() !== '')
  if (carriers.length > 0) {
    out.delete('r')
    for (const carrier of carriers) out.append('r', carrier.trim())
  }

  return out
}

const MARKETS = ['individual', 'small_group'] as const

function parseMarket(raw: string | null): SearchCriteria['market'] | QueryFailure {
  if (raw === null || raw.trim() === '') return 'individual'
  const market = raw.trim().toLowerCase()
  if (market !== 'individual' && market !== 'small_group') {
    return { error: `Unknown market "${raw}".`, hint: `Use one of: ${MARKETS.join(', ')}.` }
  }
  return market
}

function parseLimit(raw: string | null): number | QueryFailure {
  if (raw === null || raw.trim() === '') return DEFAULT_CRITERIA.perPage
  const limit = Number(raw)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return { error: `limit must be a whole number 1–${MAX_LIMIT}.`, hint: `Got "${raw}".` }
  }
  return limit
}

function parseView(raw: string | null): ApiView | QueryFailure {
  if (raw === null || raw.trim() === '') return 'summary'
  const view = raw.trim().toLowerCase()
  if (view !== 'summary' && view !== 'full') {
    return { error: 'view must be "summary" or "full".', hint: `Got "${raw}".` }
  }
  return view
}

/**
 * The codec deliberately round-trips a value it does not recognise, so a new Ideon
 * metal level cannot vanish from a shared link. An agent typing `platnium` needs
 * the opposite — an error, not an empty result set — so the API checks the decoded
 * values against the known lists.
 */
function checkVocabulary(filters: PlanFilterState): QueryFailure | null {
  const unknownMetal = filters.metalLevels.find((level) => !isMetalLevel(level))
  if (unknownMetal !== undefined) {
    return {
      error: `Unknown metal level "${unknownMetal}".`,
      hint: `Use one of: ${METAL_LEVELS.join(', ')}.`,
    }
  }
  if (!isSortKey(filters.sort)) {
    return { error: `Unknown sort "${filters.sort}".`, hint: `Use one of: ${SORT_KEYS.join(', ')}.` }
  }
  return null
}

function isFailure(value: unknown): value is QueryFailure {
  return typeof value === 'object' && value !== null && 'error' in value
}

/**
 * A search plus its view options, or the one thing an agent got wrong. Never
 * throws — a malformed parameter is an answer, not an exception.
 */
export function parseApiQuery(params: URLSearchParams): { query: ApiQuery } | QueryFailure {
  const normalised = normalise(params)
  if (isFailure(normalised)) return normalised

  const limit = parseLimit(params.get('limit'))
  if (isFailure(limit)) return limit

  const view = parseView(params.get('view'))
  if (isFailure(view)) return view

  const market = parseMarket(params.get('market'))
  if (isFailure(market)) return market

  const { criteria, filters } = decodeUrlState(normalised)
  if (!criteria) {
    return {
      error: 'zip is required and must be five digits.',
      hint: 'Try ?zip=11201&age=35 — see /AGENTS_GUIDE.md.',
    }
  }
  const unknown = checkVocabulary(filters)
  if (unknown) return unknown

  return {
    query: {
      criteria: { ...criteria, market },
      filters,
      view,
      refresh: flag(params, 'refresh'),
      limit,
    },
  }
}
