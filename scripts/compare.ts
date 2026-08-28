/**
 * Diffs this app's premiums (Ideon + Gravie modifier) against ichra-shopping's,
 * through the same services the web UI uses so the two can't drift.
 */
import { writeFile } from 'node:fs/promises'
import { compare, type CompareReport } from '../app/lib/services/compareService'
import { householdMembers, type Household } from '../app/lib/household'
import { firstOfNextMonth } from '../app/lib/dates'
import { DEFAULT_CRITERIA, searchPlans, type SearchCriteria } from '../app/lib/services/planSearch'
import { fetchBaseline, loadBaselineFile } from '../app/lib/shopping/client'
import { fetchHotwireBaseline, hotwirePayload } from '../app/lib/shopping/hotwire'
import { formatCents, formatCentsDelta } from '../app/lib/money'
import type { FetchPlansResponse } from '../app/lib/shopping/types'

const USAGE = `
compare — diff simple-plan-search premiums against ichra-shopping

USAGE
  npm run compare -- --zip <zip> [search flags] <baseline source> [output flags]

SEARCH
  --zip <zip>                  required
  --member-age <n>             the member's age (default 35)
  --member-tobacco             the member uses tobacco
  --spouse-age <n>             adds a spouse of this age
  --spouse-tobacco             the spouse uses tobacco
  --child-age <n>              adds a child; repeat once per child
  --income <n>                 household income
  --enrollment-date <date>     YYYY-MM-DD
  --market <individual|small_group>
  --limit <n>                  how many plans to pull (default 200)
  --refresh                    bypass the 24h cache and re-fetch from Ideon

BASELINE (one required)
  --baseline-file <path>       saved FetchPlansResponse JSON from shopping
  --baseline-url <base> --interview <id>
                               live GET {base}/interviews/{id}/plans
  --baseline-hotwire <base>    live POST {base}/plans/hotwire-ranked, no interview
                               needed — sends this run's household and the FIPS we
                               resolved, so both sides price the same county
  --allowance <cents>          ICHRA allowance sent to hotwire (default 0; affects
                               its ranking only, never the premium)
  --header "K: V"              extra request header, repeatable (auth)

OUTPUT
  --tolerance-cents <n>        max |delta| still counted as agreement (default 0)
  --json <path>                write the full report as JSON
  --csv <path>                 write the matched rows as CSV
  --quiet                      summary only

Exit code is 0 when every matched plan is within tolerance and neither side has
orphan plans; 1 otherwise.
`.trim()

type Flags = Map<string, string[]>

function parseArgs(argv: string[]): Flags {
  const flags: Flags = new Map()
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    const value = next !== undefined && !next.startsWith('--') ? (i++, next) : 'true'
    flags.set(key, [...(flags.get(key) ?? []), value])
  }
  return flags
}

const flags = parseArgs(process.argv.slice(2))
const first = (k: string) => flags.get(k)?.[0]
const has = (k: string) => flags.has(k)
function fail(message: string): never {
  console.error(`error: ${message}\n`)
  console.error(USAGE)
  process.exit(2)
}

if (has('help') || has('h') || flags.size === 0) {
  console.log(USAGE)
  process.exit(0)
}

const zip = first('zip')
if (!zip) fail('--zip is required')

function wholeAge(raw: string | undefined, flag: string): number {
  const n = Number(raw)
  if (!Number.isInteger(n) || n < 0 || n > 120) fail(`${flag} must be a whole age 0–120`)
  return n
}

const household: Household = {
  member: {
    age: has('member-age') ? wholeAge(first('member-age'), '--member-age') : 35,
    tobacco: has('member-tobacco'),
  },
  spouse: has('spouse-age')
    ? { age: wholeAge(first('spouse-age'), '--spouse-age'), tobacco: has('spouse-tobacco') }
    : null,
  children: (flags.get('child-age') ?? []).map((raw) => ({ age: wholeAge(raw, '--child-age') })),
}

const criteria: SearchCriteria = {
  ...DEFAULT_CRITERIA,
  zipCode: zip,
  household,
  householdIncome: has('income') ? Number(first('income')) : undefined,
  enrollmentDate: first('enrollment-date'),
  market: (first('market') as SearchCriteria['market']) ?? 'individual',
  perPage: Number(first('limit') ?? 200),
}

function extraHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const raw of flags.get('header') ?? []) {
    const at = raw.indexOf(':')
    if (at < 0) fail(`--header must look like "Name: value"; got "${raw}"`)
    headers[raw.slice(0, at).trim()] = raw.slice(at + 1).trim()
  }
  return headers
}

/** Non-null only on the hotwire path — it is the only source that reports one. */
let droppedUnpriced: number | null = null

/**
 * `ours` is passed because the hotwire payload needs the FIPS this run resolved:
 * hotwire will not derive it from the zip, and a zip spanning two counties prices
 * differently on each side.
 */
async function loadBaseline(ours: Awaited<ReturnType<typeof searchPlans>>): Promise<FetchPlansResponse> {
  const file = first('baseline-file')
  if (file) return loadBaselineFile(file)

  const hotwireBase = first('baseline-hotwire')
  if (hotwireBase) {
    const payload = hotwirePayload({
      household: criteria.household,
      zipCode: criteria.zipCode,
      fipsCode: ours.meta.fipsCode,
      coverageDate: criteria.enrollmentDate ?? firstOfNextMonth(),
      allowanceCents: has('allowance') ? Number(first('allowance')) : 0,
    })
    const result = await fetchHotwireBaseline(hotwireBase, payload, extraHeaders())
    droppedUnpriced = result.droppedUnpriced
    return result.response
  }

  const baseUrl = first('baseline-url') ?? process.env.SHOPPING_BASE_URL
  const interview = first('interview')
  if (!baseUrl || !interview) {
    fail('need --baseline-file, --baseline-hotwire, or --baseline-url with --interview')
  }
  return fetchBaseline(baseUrl, interview, extraHeaders())
}

function pad(value: string, width: number, align: 'left' | 'right' = 'left'): string {
  return align === 'left' ? value.padEnd(width) : value.padStart(width)
}

function printTable(report: CompareReport): void {
  const rows = [...report.matched].sort(
    (a, b) => Math.abs(b.deltaCents ?? 0) - Math.abs(a.deltaCents ?? 0),
  )
  const header = [
    pad('HIOS', 16),
    pad('CARRIER', 22),
    pad('METAL', 16),
    pad('IDEON', 11, 'right'),
    pad('+GRAVIE', 11, 'right'),
    pad('SHOPPING', 11, 'right'),
    pad('Δ', 11, 'right'),
    pad('Δ%', 8, 'right'),
    'FLAGS',
  ].join('  ')
  console.log(header)
  console.log('-'.repeat(header.length))

  for (const r of rows) {
    const notes: string[] = []
    if (r.modifierId === null) notes.push('unmodified')
    if (r.deltaCents === null) notes.push('unpriced')
    notes.push(...r.attributeMismatches)
    console.log(
      [
        pad(r.hiosPlanId, 16),
        pad((r.carrierName ?? '').slice(0, 22), 22),
        pad(r.metalLevel ?? '—', 16),
        pad(formatCents(r.ideonPremiumCents), 11, 'right'),
        pad(formatCents(r.finalPremiumCents), 11, 'right'),
        pad(formatCents(r.shoppingPremiumCents), 11, 'right'),
        pad(r.deltaCents === null ? '—' : formatCentsDelta(r.deltaCents), 11, 'right'),
        pad(r.deltaPct === null ? '—' : `${r.deltaPct >= 0 ? '+' : ''}${r.deltaPct.toFixed(2)}%`, 8, 'right'),
        notes.join(', '),
      ].join('  '),
    )
  }
}

function toCsv(report: CompareReport): string {
  const header = [
    'hios_plan_id',
    'carrier_name',
    'metal_level',
    'ideon_premium_cents',
    'final_premium_cents',
    'shopping_premium_cents',
    'delta_cents',
    'delta_pct',
    'within_tolerance',
    'modifier_id',
    'attribute_mismatches',
  ]
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = report.matched.map((r) =>
    [
      r.hiosPlanId,
      r.carrierName,
      r.metalLevel,
      r.ideonPremiumCents,
      r.finalPremiumCents,
      r.shoppingPremiumCents,
      r.deltaCents,
      r.deltaPct === null ? null : r.deltaPct.toFixed(4),
      r.withinTolerance,
      r.modifierId,
      r.attributeMismatches.join('; '),
    ]
      .map(escape)
      .join(','),
  )
  return [header.join(','), ...lines].join('\n') + '\n'
}

const toleranceCents = Number(first('tolerance-cents') ?? 0)
// Sequential, not parallel: the hotwire payload needs the FIPS our search resolves.
const ours = await searchPlans(criteria, { refresh: has('refresh') })
const baseline = await loadBaseline(ours)
const report = compare(ours, baseline, toleranceCents)

if (!has('quiet')) {
  console.log(
    `zip ${criteria.zipCode} (FIPS ${ours.meta.fipsCode}, ${ours.meta.state})  ` +
      `household ${householdMembers(criteria.household)
        .map((m) => `${m.relation}:${m.age}${m.tobacco ? '+tobacco' : ''}`)
        .join(' ')}  ` +
      `cache ${ours.cache.hit ? `hit (${ours.cache.ageSeconds}s old)` : 'miss'}\n`,
  )
  printTable(report)
  console.log('')
}

const s = report.summary
console.log(
  `matched ${s.matchedCount}  within ±${formatCents(toleranceCents)} ${s.withinTolerance}  ` +
    `over ${s.overTolerance}  unpriced ${s.unpricedEitherSide}`,
)
console.log(
  `only in ours ${s.onlyInOursCount}  only in shopping ${s.onlyInShoppingCount}  ` +
    `median |Δ| ${formatCents(s.medianAbsDeltaCents)}  max |Δ| ${formatCents(s.maxAbsDeltaCents)}`,
)
console.log(`gravie modifiers applied to ${ours.meta.modifiersApplied}/${ours.plans.length} plans`)
if (droppedUnpriced !== null && droppedUnpriced > 0) {
  console.log(
    `shopping returned ${droppedUnpriced} plan(s) it could not price; dropped rather than ` +
      `compared as $0. If that is most of them, the rate back-fill did not fire.`,
  )
}

const jsonPath = first('json')
if (jsonPath) {
  await writeFile(jsonPath, JSON.stringify({ criteria, meta: ours.meta, report }, null, 2))
  console.log(`wrote ${jsonPath}`)
}
const csvPath = first('csv')
if (csvPath) {
  await writeFile(csvPath, toCsv(report))
  console.log(`wrote ${csvPath}`)
}

const clean = s.overTolerance === 0 && s.onlyInOursCount === 0 && s.onlyInShoppingCount === 0
process.exit(clean ? 0 : 1)
