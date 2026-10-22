import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  areaCountyRows,
  areaIdForCountyFips,
  areaIdForZip3,
  areasInState,
  DATA,
  getArea,
  normalizeAreaId,
  statesOverview,
  type RatingAreaData,
} from './ratingAreas'

const FIXTURE: RatingAreaData = {
  planYear: 2026,
  generatedAt: '2026-10-22',
  source: 'test',
  states: {
    MN: { name: 'Minnesota', basis: 'county', areaIds: ['MN01', 'MN07'] },
    AK: { name: 'Alaska', basis: 'zip3', areaIds: ['AK02'] },
  },
  areas: {
    MN01: { id: 'MN01', state: 'MN', areaNumber: 1, basis: 'county', counties: [{ fips: '27039', name: 'Dodge' }], zip3: [] },
    MN07: { id: 'MN07', state: 'MN', areaNumber: 7, basis: 'county', counties: [{ fips: '27009', name: 'Benton' }, { fips: '27021', name: 'Cass' }], zip3: [] },
    AK02: { id: 'AK02', state: 'AK', areaNumber: 2, basis: 'zip3', counties: [], zip3: ['995', '996'] },
  },
  countyToArea: { '27039': 'MN01', '27009': 'MN07', '27021': 'MN07' },
  zip3ToArea: { 'AK:995': 'AK02', 'AK:996': 'AK02' },
}

test('normalizeAreaId canonicalises loose forms and rejects nonsense', () => {
  assert.equal(normalizeAreaId('mn7'), 'MN07')
  assert.equal(normalizeAreaId('MN-07'), 'MN07')
  assert.equal(normalizeAreaId(' sc46 '), 'SC46')
  assert.equal(normalizeAreaId('platinum'), null)
  assert.equal(normalizeAreaId('M7'), null)
  assert.equal(normalizeAreaId('MN'), null)
})

test('getArea returns the area or null', () => {
  assert.equal(getArea(FIXTURE, 'MN07')?.areaNumber, 7)
  assert.equal(getArea(FIXTURE, 'MN99'), null)
})

test('areasInState lists a state with per-area county counts', () => {
  const mn = areasInState(FIXTURE, 'mn')
  assert.equal(mn?.stateName, 'Minnesota')
  assert.deepEqual(
    mn?.areas,
    [{ id: 'MN01', areaNumber: 1, countyCount: 1 }, { id: 'MN07', areaNumber: 7, countyCount: 2 }],
  )
  assert.equal(areasInState(FIXTURE, 'ZZ'), null)
})

test('reverse lookups resolve by county FIPS and by state+zip3', () => {
  assert.equal(areaIdForCountyFips(FIXTURE, '27021'), 'MN07')
  assert.equal(areaIdForCountyFips(FIXTURE, '06037'), null)
  assert.equal(areaIdForZip3(FIXTURE, 'ak', '995'), 'AK02')
  assert.equal(areaIdForZip3(FIXTURE, 'AK', '000'), null)
})

test('statesOverview summarises every state', () => {
  assert.deepEqual(statesOverview(FIXTURE), [
    { state: 'MN', stateName: 'Minnesota', basis: 'county', areaCount: 2 },
    { state: 'AK', stateName: 'Alaska', basis: 'zip3', areaCount: 1 },
  ])
})

test('areaCountyRows emits one row per county, or per zip3 for a zip-based area', () => {
  assert.deepEqual(areaCountyRows(FIXTURE, FIXTURE.areas.MN07), [
    ['MN07', 'MN', 'Minnesota', 7, '27009', 'Benton', ''],
    ['MN07', 'MN', 'Minnesota', 7, '27021', 'Cass', ''],
  ])
  assert.deepEqual(areaCountyRows(FIXTURE, FIXTURE.areas.AK02), [
    ['AK02', 'AK', 'Alaska', 2, '', '', '995'],
    ['AK02', 'AK', 'Alaska', 2, '', '', '996'],
  ])
})

// Guards the generated crosswalk against a broken regeneration, without pinning yearly counts.
test('bundled DATA is internally consistent', () => {
  assert.ok(Object.keys(DATA.areas).length > 400)
  for (const [fips, id] of Object.entries(DATA.countyToArea)) {
    assert.ok(DATA.areas[id], `countyToArea ${fips} → missing area ${id}`)
  }
  for (const area of Object.values(DATA.areas)) {
    assert.ok(DATA.states[area.state], `area ${area.id} → unknown state ${area.state}`)
    assert.equal(normalizeAreaId(area.id), area.id, `area id ${area.id} not canonical`)
  }
  for (const key of Object.keys(DATA.zip3ToArea)) {
    assert.match(key, /^[A-Z]{2}:\d{3}$/)
  }
})
