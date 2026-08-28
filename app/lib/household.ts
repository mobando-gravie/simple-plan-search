import type { Applicant } from './ideon/types'

/**
 * The applicant household for a plan search. Shaped so "two spouses" is
 * unrepresentable rather than merely invalid. Mirrors ichra-shopping's
 * Household / HouseholdMember / MemberRelation so the compare CLI reads against
 * the same vocabulary as the service it diffs.
 */
export type Adult = { age: number; tobacco: boolean }

export type Household = {
  member: Adult
  spouse: Adult | null
  children: { age: number }[]
}

export type MemberRelation = 'primary' | 'spouse' | 'child'

export type HouseholdMember = { age: number; tobacco: boolean; relation: MemberRelation }

export const DEFAULT_HOUSEHOLD: Household = {
  member: { age: 35, tobacco: false },
  spouse: null,
  children: [],
}

/** Flat, relation-tagged view, primary first — the order Ideon echoes back. */
export function householdMembers(household: Household): HouseholdMember[] {
  const members: HouseholdMember[] = [
    { age: household.member.age, tobacco: household.member.tobacco, relation: 'primary' },
  ]
  if (household.spouse) {
    members.push({ age: household.spouse.age, tobacco: household.spouse.tobacco, relation: 'spouse' })
  }
  for (const child of household.children) {
    members.push({ age: child.age, tobacco: false, relation: 'child' })
  }
  return members
}

export function householdSize(household: Household): number {
  return 1 + (household.spouse ? 1 : 0) + household.children.length
}

/** Ideon accepts `smoker` on every applicant, so both adults carry their own flag. */
export function toApplicants(household: Household): Applicant[] {
  return householdMembers(household).map((m) => ({
    age: m.age,
    smoker: m.tobacco,
    child: m.relation === 'child',
  }))
}

export const RELATION_LABEL: Record<MemberRelation, string> = {
  primary: 'Member',
  spouse: 'Spouse',
  child: 'Child',
}
