import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, parseModifierCsv } from './modifierCsv'

const CANONICAL = `hios_plan_id,carrier_id,state,rating_area,metal_level,effective_year,multiplier,flat_cents,label
74289NY2770005,,,,,2026,1.055,0,Oscar plan override
,,NY,,gold,2026,1.035,0,NY gold load
,,NY,,,2026,1.020,0,NY statewide default
`

test('parseCsv honours quoted fields, doubled quotes and CRLF', () => {
  const rows = parseCsv('a,b\r\n"one, two","he said ""hi"""\r\n')
  assert.deepEqual(rows, [
    ['a', 'b'],
    ['one, two', 'he said "hi"'],
  ])
})

test('parseCsv drops rows that are entirely blank', () => {
  assert.deepEqual(parseCsv('a,b\n\n,\n1,2\n'), [
    ['a', 'b'],
    ['1', '2'],
  ])
})

test('the canonical header imports every row', () => {
  const result = parseModifierCsv(CANONICAL)
  assert.equal(result.errors.length, 0)
  assert.equal(result.unmappedColumns.length, 0)
  assert.equal(result.rows.length, 3)
  assert.deepEqual(result.rows[0], {
    hiosPlanId: '74289NY2770005',
    carrierId: null,
    state: null,
    ratingArea: null,
    metalLevel: null,
    effectiveYear: 2026,
    multiplier: 1.055,
    flatCents: 0,
    label: 'Oscar plan override',
  })
})

test('blank key cells become nulls so they match anything', () => {
  const { rows } = parseModifierCsv(CANONICAL)
  assert.equal(rows[2].hiosPlanId, null)
  assert.equal(rows[2].metalLevel, null)
  assert.equal(rows[2].state, 'NY')
})

test('header matching ignores case, spaces, dashes and underscores', () => {
  const { rows, unmappedColumns } = parseModifierCsv(
    'HIOS Plan ID,Metal-Level,planYear,Factor\n74289NY2770005,Gold,2026,1.05\n',
  )
  assert.deepEqual(unmappedColumns, [])
  assert.equal(rows[0].hiosPlanId, '74289NY2770005')
  assert.equal(rows[0].metalLevel, 'gold')
  assert.equal(rows[0].effectiveYear, 2026)
  assert.equal(rows[0].multiplier, 1.05)
})

test('state is upper-cased and metal level lower-cased so matching is stable', () => {
  const { rows } = parseModifierCsv('state,metal,multiplier\nny,GOLD,1.01\n')
  assert.equal(rows[0].state, 'NY')
  assert.equal(rows[0].metalLevel, 'gold')
})

test('a missing multiplier defaults to identity rather than zeroing the premium', () => {
  const { rows } = parseModifierCsv('state,multiplier,flat_cents\nNY,,500\n')
  assert.equal(rows[0].multiplier, 1)
  assert.equal(rows[0].flatCents, 500)
})

test('a flat amount written as dollars is converted, a bare integer is taken as cents', () => {
  const { rows } = parseModifierCsv(
    'state,flat_cents\nNY,$12.50\nMN,1250\nWI,12.50\n',
  )
  assert.equal(rows[0].flatCents, 1250)
  assert.equal(rows[1].flatCents, 1250)
  assert.equal(rows[2].flatCents, 1250)
})

test('a percent-signed multiplier is read as a load on top of 1.0', () => {
  const { rows } = parseModifierCsv('state,multiplier\nNY,3.5%\n')
  assert.equal(rows[0].multiplier, 1.035)
})

test('an out-of-range multiplier is reported and its row skipped', () => {
  const { rows, errors } = parseModifierCsv('state,multiplier\nNY,0\nMN,1.02\nWI,25\n')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].state, 'MN')
  assert.equal(errors.length, 2)
  assert.match(errors[0].message, /multiplier out of range/)
  assert.equal(errors[0].line, 2)
})

test('unrecognized columns are reported rather than silently dropped', () => {
  const { rows, unmappedColumns } = parseModifierCsv(
    'state,multiplier,gravie_internal_id,updated_by\nNY,1.02,abc,someone\n',
  )
  assert.deepEqual(unmappedColumns, ['gravie_internal_id', 'updated_by'])
  assert.equal(rows.length, 1)
})

test('a header with neither multiplier nor flat column is rejected outright', () => {
  const { rows, errors } = parseModifierCsv('state,metal_level\nNY,gold\n')
  assert.equal(rows.length, 0)
  assert.match(errors[0].message, /neither a multiplier nor a flat-amount/)
})

test('an empty file reports one error instead of throwing', () => {
  const { rows, errors } = parseModifierCsv('')
  assert.equal(rows.length, 0)
  assert.equal(errors[0].message, 'file is empty')
})

test('a non-integer effective year is reported and its row skipped', () => {
  const { rows, errors } = parseModifierCsv('state,effective_year,multiplier\nNY,FY2026,1.02\n')
  assert.equal(rows.length, 0)
  assert.match(errors[0].message, /effective year is not an integer/)
})
