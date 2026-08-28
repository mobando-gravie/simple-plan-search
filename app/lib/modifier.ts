/**
 * Gravie premium modifiers. A modifier row's key columns are each nullable, where
 * NULL means "matches any"; the most specific matching row wins.
 */

export type GravieModifier = {
  id: number
  batchId: number
  hiosPlanId: string | null
  carrierId: string | null
  state: string | null
  ratingArea: string | null
  metalLevel: string | null
  effectiveYear: number | null
  multiplier: number
  flatCents: number
  /** EASY_ENROLL | SELF_ENROLL | null — Gravie's overlay, absent from Ideon. */
  enrollmentType: string | null
  label: string | null
}

/** The plan attributes a modifier can key on. */
export type ModifierTarget = {
  hiosPlanId: string
  carrierId: string | null
  state: string | null
  ratingArea: string | null
  metalLevel: string | null
  effectiveYear: number | null
}

/** Higher weight = more specific. Sums to the score that picks a winner. */
const WEIGHTS = {
  hiosPlanId: 32,
  carrierId: 16,
  ratingArea: 8,
  metalLevel: 4,
  state: 2,
  effectiveYear: 1,
} as const

export const IDENTITY: Pick<GravieModifier, 'multiplier' | 'flatCents'> = {
  multiplier: 1,
  flatCents: 0,
}

function sameText(rule: string | null, actual: string | null): boolean | null {
  if (rule === null) return null
  if (actual === null) return false
  return rule.trim().toLowerCase() === actual.trim().toLowerCase()
}

/** null score = the rule does not apply to this plan at all. */
export function specificity(m: GravieModifier, target: ModifierTarget): number | null {
  let score = 0
  const textChecks: [keyof typeof WEIGHTS, string | null, string | null][] = [
    ['hiosPlanId', m.hiosPlanId, target.hiosPlanId],
    ['carrierId', m.carrierId, target.carrierId],
    ['ratingArea', m.ratingArea, target.ratingArea],
    ['metalLevel', m.metalLevel, target.metalLevel],
    ['state', m.state, target.state],
  ]
  for (const [key, rule, actual] of textChecks) {
    const matched = sameText(rule, actual)
    if (matched === false) return null
    if (matched === true) score += WEIGHTS[key]
  }
  if (m.effectiveYear !== null) {
    if (m.effectiveYear !== target.effectiveYear) return null
    score += WEIGHTS.effectiveYear
  }
  return score
}

/** Most specific match; ties break to the most recently imported row. */
export function findModifier(
  modifiers: GravieModifier[],
  target: ModifierTarget,
): GravieModifier | null {
  let best: GravieModifier | null = null
  let bestScore = -1
  for (const m of modifiers) {
    const score = specificity(m, target)
    if (score === null) continue
    if (score > bestScore || (score === bestScore && best !== null && m.id > best.id)) {
      best = m
      bestScore = score
    }
  }
  return best
}

/** round(ideon × multiplier) + flat. */
export function applyModifier(
  ideonPremiumCents: number,
  modifier: Pick<GravieModifier, 'multiplier' | 'flatCents'> = IDENTITY,
): number {
  return Math.round(ideonPremiumCents * modifier.multiplier) + modifier.flatCents
}
