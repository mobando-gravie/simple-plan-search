/**
 * Pre-fills the identifier cache from a backtest CSV. `npm run warm-labels <csv> [--resolve-ndc]`
 *
 * Names are free: the export already carries `Provider Names` and `Rx Drug Names`
 * beside the id columns. NDCs are not in the CSV, so `--resolve-ndc` is what makes
 * drug pastes work offline — one Ideon call per RxCUI, hence the opt-in.
 *
 * Reads only the entity columns. Member ids, dates of birth and ZIPs are PHI and
 * are never read, logged or stored.
 */
import { readFileSync } from 'node:fs'
import { fetchDrugByRxcui } from '../app/lib/ideon/client'
import { isNpi, isRxcui } from '../app/lib/identifiers'
import { rememberLabels, type EntityRecord } from '../app/lib/repos/entityLabelRepo'

const [, , csvPath, ...flags] = process.argv
const resolveNdc = flags.includes('--resolve-ndc')

if (!csvPath) {
  console.error('usage: npm run warm-labels <csv> [--resolve-ndc]')
  process.exit(1)
}

/** Minimal RFC-4180 reader — drug names contain commas inside quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (c !== '\r') field += c
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  const [header, ...body] = rows
  return body
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i]])))
}

const split = (v: string | undefined) =>
  (v ?? '').split('|').map((s) => s.trim()).filter(Boolean)

const rows = parseCsv(readFileSync(csvPath, 'utf8'))
console.log(`read ${rows.length} rows from ${csvPath}`)

// Pairs are only trustworthy when the id and name lists line up — the backtest
// loader refuses to guess here too, and a mispaired name is worse than none.
const providers = new Map<string, string>()
const drugs = new Map<string, string>()
let skipped = 0

for (const row of rows) {
  const npis = split(row['Provider NPIs'])
  const names = split(row['Provider Names'])
  if (npis.length === names.length) {
    npis.forEach((npi, i) => { if (isNpi(npi)) providers.set(npi, names[i]) })
  } else if (npis.length > 0) skipped++

  const rxcuis = split(row['Rx RxCUI IDs'])
  const drugNames = split(row['Rx Drug Names'])
  if (rxcuis.length === drugNames.length) {
    rxcuis.forEach((cui, i) => { if (isRxcui(cui)) drugs.set(cui, drugNames[i]) })
  } else if (rxcuis.length > 0) skipped++
}

console.log(`distinct: ${providers.size} providers, ${drugs.size} drugs`)
if (skipped > 0) console.log(`skipped ${skipped} misaligned id/name lists`)

async function main() {
  const providerRows: EntityRecord[] = [...providers].map(([id, label]) => ({ id, label }))
  await rememberLabels('provider', providerRows)
  console.log(`cached ${providerRows.length} provider names`)

  const drugRows: EntityRecord[] = [...drugs].map(([id, label]) => ({ id, label }))
  if (!resolveNdc) {
    await rememberLabels('drug_rxcui', drugRows)
    console.log(`cached ${drugRows.length} drug names (no NDC — pass --resolve-ndc for those)`)
    return
  }

  console.log(`resolving ${drugRows.length} NDCs from Ideon…`)
  let done = 0
  let withNdc = 0
  let noSuchDrug = 0
  const failures: string[] = []
  const queue = [...drugRows]

  // Two workers, not six: six tripped Ideon's rate limiter and the errors were being
  // swallowed as "this drug has no NDC", which silently under-filled the cache.
  const workers = Array.from({ length: 2 }, async () => {
    for (let row = queue.pop(); row; row = queue.pop()) {
      try {
        const hit = await fetchDrugByRxcui(Number(row.id))
        const ndc = hit?.packages[0]?.ndc
        if (hit && ndc) {
          row.label = hit.name
          row.payload = { ndc, medId: hit.medId }
          withNdc++
        } else {
          noSuchDrug++
        }
      } catch (e) {
        failures.push(row.id)
        if (failures.length <= 3) console.error(`  ${row.id}: ${(e as Error).message.slice(0, 110)}`)
      }
      if (++done % 100 === 0) console.log(`  ${done}/${drugRows.length}`)
    }
  })
  await Promise.all(workers)
  await rememberLabels('drug_rxcui', drugRows)

  console.log(`cached ${drugRows.length} drugs — ${withNdc} with an NDC`)
  if (noSuchDrug > 0) console.log(`${noSuchDrug} rxcuis Ideon does not know`)
  if (failures.length > 0) {
    console.log(`${failures.length} FAILED (not the same as unknown) — re-run to retry them`)
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1) })
