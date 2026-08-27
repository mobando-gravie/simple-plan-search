// Idempotent schema apply. `npm run migrate`
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { neon } from '@neondatabase/serverless'

const here = dirname(fileURLToPath(import.meta.url))
const schema = readFileSync(join(here, '..', 'app', 'lib', 'schema.sql'), 'utf8')

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL must be set')
  process.exit(1)
}

// The HTTP driver rejects multi-statement bodies, so run one statement at a time.
// Comments are stripped first — a `;` inside one would split a statement in half.
const statements = schema
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

const sql = neon(connectionString)
for (const statement of statements) {
  await sql.query(statement)
}

const rows = (await sql.query(
  `SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'sps\\_%'
    ORDER BY table_name`,
)) as { table_name: string }[]

console.log(`Applied ${statements.length} statements. sps_ tables now present:`)
for (const r of rows) console.log(`  ${r.table_name}`)
