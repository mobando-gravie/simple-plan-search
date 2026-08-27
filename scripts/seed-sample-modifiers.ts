// Imports samples/gravie-modifiers.sample.csv as a batch. Dev convenience only.
import { readFileSync } from 'node:fs'
import { importModifierCsv } from '../app/lib/services/modifierService'

const path = process.argv[2] ?? 'samples/gravie-modifiers.sample.csv'
const outcome = await importModifierCsv(
  path.split('/').pop() ?? path,
  readFileSync(path, 'utf8'),
  'seeded via scripts/seed-sample-modifiers.ts',
)
console.log(JSON.stringify(outcome, null, 2))
