/**
 * Diffs this app's premiums (Ideon + Gravie modifier) against ichra-shopping's,
 * through the same services the web UI uses so the two can't drift.
 */
import { writeFile } from 'node:fs/promises'
import { compare, type CompareReport } from '../app/lib/services/compareService'
import { DEFAULT_CRITERIA, searchPlans, type SearchCriteria } from '../app/lib/services/planSearch'
import { fetchBaseline, loadBaselineFile } from '../app/lib/shopping/client'
import { formatCents, formatCentsDelta } from '../app/lib/money'
import type { FetchPlansResponse } from '../app/lib/shopping/types'

const USAGE = `
compare — diff simple-plan-search premiums against ichra-shopping

USAGE
  npm run compare -- --zip <zip> [search flags] <baseline source> [output flags]

SEARCH
  --zip <zip>                  required
  --age <n>                    single adult age (default 35)
  --adults <a,b>               adult ages, overrides --age
  --children <a,b>             dependent child ages
  --smoker                     primary applicant uses tobacco
  --income <n>                 household income
  --household-size <n>         household size
  --enrollment-date <date>     YYYY-MM-DD
  --market <individual|small_group>
  --limit <n>                  plans per page (default 100)
  --refresh                    bypass the 24h cache and re-fetch from Ideon

BASELINE (one required)
  --baseline-file <path>       saved FetchPlansResponse JSON from shopping
  --baseline-url <base> --interview <id>
                               live GET {base}/interviews/{id}/plans
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
const numbers = (k: string) =>
  (first(k) ?? '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0)

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

const adultAges = has('adults') ? numbers('adults') : [Number(first('age') ?? 35)]
if (adultAges.length === 0 || adultAges.some((a) => !Number.isInteger(a))) {
  fail('--age / --adults must be whole numbers')
}

const criteria: SearchCriteria = {
  ...DEFAULT_CRITERIA,
  zipCode: zip,
  adultAges,
  childAges: has('children') ? numbers('children') : [],
  smoker: has('smoker'),
  householdIncome: has('income') ? Number(first('income')) : undefined,
  householdSize: has('household-size') ? Number(first('household-size')) : undefined,
  enrollmentDate: first('enrollment-date'),
  market: (first('market') as SearchCriteria['market']) ?? 'individual',
  perPage: Number(first('limit') ?? 100),
}

async function loadBaseline(): Promise<FetchPlansResponse> {
  const file = first('baseline-file')
  if (file) return loadBaselineFile(file)

  const baseUrl = first('baseline-url') ?? process.env.SHOPPING_BASE_URL
  const interview = first('interview')
  if (!baseUrl || !interview) {
    fail('need --baseline-file, or --baseline-url with --interview')
  }
  const headers: Record<string, string> = {}
  for (const raw of flags.get('header') ?? []) {
    const at = raw.indexOf(':')
    if (at < 0) fail(`--header must look like "Name: value"; got "${raw}"`)
    headers[raw.slice(0, at).trim()] = raw.slice(at + 1).trim()
  }
  return fetchBaseline(baseUrl, interview, headers)
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
const [ours, baseline] = await Promise.all([
  searchPlans(criteria, { refresh: has('refresh') }),
  loadBaseline(),
])
const report = compare(ours, baseline, toleranceCents)

if (!has('quiet')) {
  console.log(
    `zip ${criteria.zipCode} (FIPS ${ours.meta.fipsCode}, ${ours.meta.state})  ` +
      `adults ${criteria.adultAges.join(',')}  children ${criteria.childAges.join(',') || 'none'}  ` +
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
