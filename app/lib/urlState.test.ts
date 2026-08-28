import assert from 'node:assert/strict'
import { test } from 'node:test'
import { firstOfNextMonth } from './dates'
import { DEFAULT_FILTERS, type PlanFilterState } from './planFilter'
import { DEFAULT_CRITERIA, type SearchCriteria } from './services/planSearch'
import {
  decodeUrlState,
  encodeCriteria,
  encodeView,
  isDefaultFilters,
  type SearchParamsInput,
} from './urlState'

function decode(query: string) {
  return decodeUrlState(new URLSearchParams(query))
}

const criteria = (over: Partial<SearchCriteria> = {}): SearchCriteria => ({
  ...DEFAULT_CRITERIA,
  zipCode: '11201',
  household: { member: { age: 40, tobacco: false }, spouse: null, children: [] },
  ...over,
})

// ---------------------------------------------------------------- length

test('a one-person search encodes to two parameters', () => {
  assert.equal(encodeCriteria(criteria()).toString(), 'z=11201&a=40')
})

test('a loaded search stays short — no commas, nothing at a default', () => {
  const params = encodeCriteria(
    criteria({
      zipCode: '75201',
      household: {
        member: { age: 40, tobacco: true },
        spouse: { age: 38, tobacco: false },
        children: [{ age: 10 }, { age: 8 }],
      },
      householdIncome: 80000,
      allowanceCents: 40000,
    }),
  )
  assert.equal(params.toString(), 'z=75201&a=40t.38&k=10.8&i=80000&w=400')
  assert.ok(!params.toString().includes('%'), 'no character should need escaping')
})

test('every filter at its default contributes nothing', () => {
  assert.equal(encodeView(new URLSearchParams(), DEFAULT_FILTERS, null).toString(), '')
  assert.ok(isDefaultFilters(DEFAULT_FILTERS))
})

// ---------------------------------------------------------------- criteria

test('tobacco rides on the age as a one-character suffix', () => {
  const { criteria: decoded } = decode('z=11201&a=40t.38t')
  assert.deepEqual(decoded?.household.member, { age: 40, tobacco: true })
  assert.deepEqual(decoded?.household.spouse, { age: 38, tobacco: true })
})

test('a spouse-less household leaves the second slot empty', () => {
  const { criteria: decoded } = decode('z=11201&a=40')
  assert.equal(decoded?.household.spouse, null)
})

test('the allowance travels in dollars and lands in cents', () => {
  assert.equal(decode('z=11201&a=40&w=400')?.criteria?.allowanceCents, 40_000)
  assert.equal(encodeCriteria(criteria({ allowanceCents: 40_000 })).get('w'), '400')
})

test('a half-dollar allowance survives the round trip', () => {
  const encoded = encodeCriteria(criteria({ allowanceCents: 40_050 }))
  assert.equal(encoded.get('w'), '400.5')
  assert.equal(decodeUrlState(encoded).criteria?.allowanceCents, 40_050)
})

test('the enrollment date is omitted when it is the default month', () => {
  const encoded = encodeCriteria(criteria({ enrollmentDate: firstOfNextMonth() }))
  assert.equal(encoded.get('d'), null)
})

test('a pinned enrollment date is carried', () => {
  const encoded = encodeCriteria(criteria({ enrollmentDate: '2027-03-01' }))
  assert.equal(encoded.get('d'), '2027-03-01')
  assert.equal(decodeUrlState(encoded).criteria?.enrollmentDate, '2027-03-01')
})

test('providers are NPIs only and drugs pair a med id with an NDC', () => {
  const encoded = encodeCriteria(
    criteria({
      providers: [{ npi: 1164996864, name: 'Jordan Smith' }],
      drugs: [{ medId: 1234, ndc: '00093-7148-01', name: 'atorvastatin' }],
    }),
  )
  assert.equal(encoded.get('p'), '1164996864')
  assert.equal(encoded.get('x'), '1234_00093-7148-01')

  const { criteria: decoded } = decodeUrlState(encoded)
  assert.deepEqual(decoded?.providers, [{ npi: 1164996864, name: '1164996864' }])
  assert.deepEqual(decoded?.drugs, [
    { medId: 1234, ndc: '00093-7148-01', name: '00093-7148-01' },
  ])
})

test('two drugs separate on a dot without disturbing the dashes in an NDC', () => {
  const { criteria: decoded } = decode('z=11201&a=40&x=1234_00093-7148-01.5678_00069-4200-30')
  assert.deepEqual(
    decoded?.drugs.map((d) => d.ndc),
    ['00093-7148-01', '00069-4200-30'],
  )
})

test('the constants no user sets are restored from DEFAULT_CRITERIA', () => {
  const { criteria: decoded } = decode('z=11201&a=40')
  assert.equal(decoded?.perPage, DEFAULT_CRITERIA.perPage)
  assert.equal(decoded?.market, DEFAULT_CRITERIA.market)
  assert.equal(decoded?.sort, DEFAULT_CRITERIA.sort)
})

test("Next's searchParams object decodes as readily as a URLSearchParams", () => {
  const input: SearchParamsInput = { z: '11201', a: '40', r: ['Oscar', 'Ambetter'] }
  const state = decodeUrlState(input)
  assert.equal(state.criteria?.zipCode, '11201')
  assert.deepEqual(state.filters.carriers, ['Oscar', 'Ambetter'])
})

// ---------------------------------------------------------------- degrading

test('no ZIP means no search rather than an error', () => {
  assert.equal(decode('a=40').criteria, null)
  assert.equal(decode('').criteria, null)
})

test('a malformed ZIP or member age yields no search', () => {
  assert.equal(decode('z=112&a=40').criteria, null)
  assert.equal(decode('z=11201&a=abc').criteria, null)
  assert.equal(decode('z=11201&a=999').criteria, null)
})

test('junk in an optional field is dropped, not fatal', () => {
  const { criteria: decoded } = decode('z=11201&a=40&i=abc&w=-500&d=nonsense&k=4.oops')
  assert.equal(decoded?.householdIncome, undefined)
  assert.equal(decoded?.allowanceCents, undefined)
  assert.equal(decoded?.enrollmentDate, undefined)
  assert.deepEqual(decoded?.household.children, [{ age: 4 }])
})

test('a drug without an NDC is skipped — the NDC is what drives the coverage query', () => {
  assert.deepEqual(decode('z=11201&a=40&x=1234').criteria?.drugs, [])
})

// ---------------------------------------------------------------- filters

test('metal levels compress to codes and back', () => {
  const filters: PlanFilterState = { ...DEFAULT_FILTERS, metalLevels: ['silver', 'gold'] }
  const encoded = encodeView(new URLSearchParams(), filters, null)
  assert.equal(encoded.get('f'), 's.g')
  assert.deepEqual(decodeUrlState(encoded).filters.metalLevels, ['silver', 'gold'])
})

test('an unrecognised metal level round-trips as itself instead of vanishing', () => {
  const filters: PlanFilterState = { ...DEFAULT_FILTERS, metalLevels: ['titanium'] }
  const encoded = encodeView(new URLSearchParams(), filters, null)
  assert.equal(encoded.get('f'), 'titanium')
  assert.deepEqual(decodeUrlState(encoded).filters.metalLevels, ['titanium'])
})

test('carriers repeat the parameter, so a dot in a name cannot split it', () => {
  const filters: PlanFilterState = { ...DEFAULT_FILTERS, carriers: ['U.S. Health', 'Oscar'] }
  const encoded = encodeView(new URLSearchParams(), filters, null)
  assert.deepEqual(decodeUrlState(encoded).filters.carriers, ['U.S. Health', 'Oscar'])
})

test('the default sort is absent and any other sort is two characters', () => {
  assert.equal(encodeView(new URLSearchParams(), DEFAULT_FILTERS, null).get('o'), null)
  const encoded = encodeView(
    new URLSearchParams(),
    { ...DEFAULT_FILTERS, sort: 'free-floor' },
    null,
  )
  assert.equal(encoded.get('o'), 'ff')
  assert.equal(decodeUrlState(encoded).filters.sort, 'free-floor')
})

test('every sort key survives the round trip', () => {
  const keys = [
    'premium-asc',
    'premium-desc',
    'deductible-asc',
    'deductible-desc',
    'oopMax-asc',
    'oopMax-desc',
    'name',
    'free-floor',
  ] as const
  for (const sort of keys) {
    const encoded = encodeView(new URLSearchParams(), { ...DEFAULT_FILTERS, sort }, null)
    assert.equal(decodeUrlState(encoded).filters.sort, sort, sort)
  }
})

test('the whole filter set round-trips', () => {
  const filters: PlanFilterState = {
    search: 'clear value',
    metalLevels: ['bronze', 'expanded_bronze'],
    planTypes: ['hmo', 'ppo'],
    carriers: ['Oscar'],
    hsaOnly: true,
    maxPremiumCents: 80_000,
    maxDeductibleCents: 500_000,
    drugCoverage: 'match',
    providerCoverage: 'partial',
    sort: 'oopMax-desc',
  }
  assert.deepEqual(decodeUrlState(encodeView(new URLSearchParams(), filters, null)).filters, filters)
})

test('clearing a filter removes its parameter rather than emptying it', () => {
  const dirty = encodeView(
    new URLSearchParams(),
    { ...DEFAULT_FILTERS, hsaOnly: true, search: 'gold', carriers: ['Oscar'] },
    null,
  )
  const cleared = encodeView(dirty, DEFAULT_FILTERS, null)
  assert.equal(cleared.toString(), '')
})

test('encodeView leaves the search parameters alone', () => {
  const base = encodeCriteria(criteria({ householdIncome: 80000 }))
  const merged = encodeView(base, { ...DEFAULT_FILTERS, hsaOnly: true }, null)
  assert.equal(merged.get('z'), '11201')
  assert.equal(merged.get('a'), '40')
  assert.equal(merged.get('i'), '80000')
  assert.equal(merged.get('hsa'), '1')
})

// ---------------------------------------------------------------- open plan

test('the open plan travels as its HIOS id', () => {
  const encoded = encodeView(new URLSearchParams(), DEFAULT_FILTERS, '25303NY0610001')
  assert.equal(encoded.toString(), 'v=25303NY0610001')
  assert.equal(decodeUrlState(encoded).openPlanId, '25303NY0610001')
})

test('closing the modal drops the parameter', () => {
  const open = encodeView(new URLSearchParams(), DEFAULT_FILTERS, '25303NY0610001')
  assert.equal(encodeView(open, DEFAULT_FILTERS, null).toString(), '')
})

test('a full shareable link decodes to all three pieces of state', () => {
  const state = decode('z=75201&a=40t.38&k=10.8&w=400&f=s.g&o=ff&v=25303NY0610001')
  assert.equal(state.criteria?.zipCode, '75201')
  assert.equal(state.criteria?.allowanceCents, 40_000)
  assert.deepEqual(state.filters.metalLevels, ['silver', 'gold'])
  assert.equal(state.filters.sort, 'free-floor')
  assert.equal(state.openPlanId, '25303NY0610001')
})

test('an unresolved drug round-trips as r<rxcui> so a shared link keeps the denominator', () => {
  const criteria: SearchCriteria = {
    ...DEFAULT_CRITERIA,
    zipCode: '11201',
    household: { member: { age: 35, tobacco: false }, spouse: null, children: [] },
    drugs: [
      { medId: 281606, ndc: '63187-0748-28', name: 'norethindrone' },
      { medId: 0, ndc: null, name: 'RxCUI 999999', rxcui: 999999 },
    ],
  }
  const encoded = encodeCriteria(criteria)
  assert.equal(encoded.get('x'), '281606_63187-0748-28.r999999')

  const back = decodeUrlState(encoded).criteria
  assert.equal(back?.drugs.length, 2, 'the unresolved drug must survive the round trip')
  assert.equal(back?.drugs[1].ndc, null)
  assert.equal(back?.drugs[1].rxcui, 999999)
})

test('cd=1 predates the partial state and still decodes as "covers all"', () => {
  // Links shared before the tri-state control existed must keep their meaning.
  const legacy = decodeUrlState(new URLSearchParams('z=11201&a=35&cd=1&pn=1'))
  assert.equal(legacy.filters.drugCoverage, 'match')
  assert.equal(legacy.filters.providerCoverage, 'match')
})

test('the partial state round-trips as p, and off drops out of the URL', () => {
  const encoded = encodeView(
    new URLSearchParams(),
    { ...DEFAULT_FILTERS, drugCoverage: 'partial', providerCoverage: null },
    null,
  )
  assert.equal(encoded.get('cd'), 'p')
  assert.equal(encoded.get('pn'), null, 'the filter being off must not appear at all')
  assert.equal(decodeUrlState(encoded).filters.drugCoverage, 'partial')
})
