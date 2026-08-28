import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_HOUSEHOLD,
  householdMembers,
  householdSize,
  toApplicants,
  type Household,
} from './household'

const SOLO: Household = { member: { age: 40, tobacco: false }, spouse: null, children: [] }

const FAMILY: Household = {
  member: { age: 40, tobacco: true },
  spouse: { age: 38, tobacco: false },
  children: [{ age: 8 }, { age: 5 }],
}

test('a member on their own is one applicant', () => {
  assert.equal(householdSize(SOLO), 1)
  assert.deepEqual(toApplicants(SOLO), [{ age: 40, smoker: false, child: false }])
})

test('size counts the member, the spouse and every child', () => {
  assert.equal(householdSize(FAMILY), 4)
  assert.equal(householdSize({ ...FAMILY, spouse: null }), 3)
  assert.equal(householdSize({ ...FAMILY, children: [] }), 2)
})

test('members come back relation-tagged, primary first — the order Ideon echoes', () => {
  assert.deepEqual(householdMembers(FAMILY), [
    { age: 40, tobacco: true, relation: 'primary' },
    { age: 38, tobacco: false, relation: 'spouse' },
    { age: 8, tobacco: false, relation: 'child' },
    { age: 5, tobacco: false, relation: 'child' },
  ])
})

test('the spouse is omitted from the member list when there is none', () => {
  const relations = householdMembers({ ...FAMILY, spouse: null }).map((m) => m.relation)
  assert.deepEqual(relations, ['primary', 'child', 'child'])
})

test('applicants carry child:true only for children', () => {
  assert.deepEqual(
    toApplicants(FAMILY).map((a) => a.child),
    [false, false, true, true],
  )
})

test('each adult carries their own tobacco flag, not just the primary', () => {
  const spouseSmokes: Household = {
    member: { age: 40, tobacco: false },
    spouse: { age: 38, tobacco: true },
    children: [],
  }
  assert.deepEqual(
    toApplicants(spouseSmokes).map((a) => a.smoker),
    [false, true],
  )
})

test('children are never marked as tobacco users', () => {
  const withKids: Household = {
    member: { age: 40, tobacco: true },
    spouse: { age: 38, tobacco: true },
    children: [{ age: 17 }],
  }
  assert.deepEqual(
    toApplicants(withKids).map((a) => a.smoker),
    [true, true, false],
  )
})

test('child order is preserved so Ideon applicant echoes line up', () => {
  const ordered: Household = {
    member: { age: 40, tobacco: false },
    spouse: null,
    children: [{ age: 10 }, { age: 3 }, { age: 7 }],
  }
  assert.deepEqual(
    toApplicants(ordered).map((a) => a.age),
    [40, 10, 3, 7],
  )
})

test('the default household is a single 35-year-old non-smoker', () => {
  assert.equal(householdSize(DEFAULT_HOUSEHOLD), 1)
  assert.deepEqual(toApplicants(DEFAULT_HOUSEHOLD), [{ age: 35, smoker: false, child: false }])
})
