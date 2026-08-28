import { Check } from 'lucide-react'
import { householdMembers, householdSize, RELATION_LABEL, type Household } from '@/app/lib/household'
import { formatCents, formatCentsDelta } from '@/app/lib/money'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import { CHIP, TABLE_WRAP, TBODY, TD, TH, TH_RIGHT, THEAD, TR } from '@/app/ui/theme'

// member-frontend renders every chip in one flat gray because it shows a single
// plan at a time. A 50-row comparison table earns per-tier color, so each tier
// takes the brand's variant-chip formula: tint, text and border from one family.
const METAL_STYLES: Record<string, string> = {
  bronze: 'bg-marketplace-orange-20 text-marketplace-orange-70 border-marketplace-orange-30',
  expanded_bronze:
    'bg-marketplace-orange-20 text-marketplace-orange-70 border-marketplace-orange-30',
  silver: 'bg-ink-10 text-ink-50 border-ink-15',
  gold: 'bg-brown-gravie-10 text-brown-gravie-50 border-brown-gravie-20',
  platinum: 'bg-secondary-green-10 text-secondary-green-70 border-secondary-green-60',
  catastrophic: 'bg-destructive/10 text-destructive border-destructive/30',
}

function MetalBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-brown-gravie-30">—</span>
  const style = METAL_STYLES[level] ?? 'bg-ink-10 text-ink-50 border-ink-15'
  return <span className={`${CHIP} capitalize ${style}`}>{level.replace('_', ' ')}</span>
}

function modifierSummary(plan: PricedPlan): string {
  if (plan.modifierId === null) return 'unmodified'
  const parts: string[] = []
  if (plan.gravieMultiplier !== 1) parts.push(`×${plan.gravieMultiplier}`)
  if (plan.gravieFlatCents !== 0) parts.push(formatCentsDelta(plan.gravieFlatCents))
  return parts.length > 0 ? parts.join(' ') : 'identity'
}

/**
 * Ideon echoes applicants back in the order they were sent, so zipping against the
 * household recovers each person's relation. A composite-rated plan carries no
 * per-person figures at all — Ideon prices those by household tier.
 */
function MemberBreakdown({ plan, household }: { plan: PricedPlan; household: Household }) {
  if (plan.applicantPremiums.length === 0) return null

  const members = householdMembers(household)
  return (
    <details className="mt-1.5">
      <summary className="cursor-pointer text-paragraph-extra-small text-marketplace-orange-60">
        Per-member premium
      </summary>
      {plan.compositeRated ? (
        <p className="mt-1 text-paragraph-extra-small text-brown-gravie-50">
          Composite rated — Ideon prices this plan by household tier, not per person.
        </p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {plan.applicantPremiums.map((applicant, i) => (
            <li
              key={i}
              className="flex justify-between gap-4 text-paragraph-extra-small text-brown-gravie-50"
            >
              <span>
                {RELATION_LABEL[members[i]?.relation ?? (applicant.child ? 'child' : 'primary')]}
                {applicant.age !== null && ` · age ${applicant.age}`}
              </span>
              <span className="tnum">
                {applicant.waived ? (
                  <span title="ACA three-oldest-children-under-21 cap">not charged</span>
                ) : (
                  formatCents(applicant.premiumCents)
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}

export default function PlanTable({
  plans,
  household,
}: {
  plans: PricedPlan[]
  household: Household
}) {
  if (plans.length === 0) {
    return <p className="text-paragraph-small text-brown-gravie-50">No plans matched this search.</p>
  }

  const family = householdSize(household) > 1
  const costShareLabel = family ? 'family' : 'individual'
  const deductibleOf = (p: PricedPlan) =>
    family ? p.deductibleFamilyCents : p.deductibleIndividualCents
  const oopMaxOf = (p: PricedPlan) =>
    family ? p.outOfPocketMaxFamilyCents : p.outOfPocketMaxIndividualCents

  return (
    <div className={TABLE_WRAP}>
      <table className="w-full">
        <thead className={THEAD}>
          <tr>
            <th className={TH}>Plan</th>
            <th className={TH}>Metal</th>
            <th className={TH_RIGHT}>Ideon</th>
            <th className={TH}>Modifier</th>
            <th className={TH_RIGHT}>Gravie premium</th>
            <th className={TH_RIGHT}>Deductible ({costShareLabel})</th>
            <th className={TH_RIGHT}>OOP max ({costShareLabel})</th>
          </tr>
        </thead>
        <tbody className={TBODY}>
          {plans.map((plan) => (
            <tr key={plan.hiosPlanId} className={TR}>
              <td className={`${TD} max-w-md`}>
                <div className="truncate font-bold text-ink-60" title={plan.planName}>
                  {plan.planName}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-paragraph-extra-small text-brown-gravie-50">
                  <span>{plan.carrierName}</span>
                  <span className="font-mono">{plan.hiosPlanId}</span>
                  {plan.planType && <span>{plan.planType}</span>}
                  {plan.hsaEligible && (
                    <span className="inline-flex items-center gap-0.5 font-bold text-secondary-green-70">
                      <Check className="h-3 w-3" />
                      HSA
                    </span>
                  )}
                </div>
                <MemberBreakdown plan={plan} household={household} />
              </td>
              <td className={TD}>
                <MetalBadge level={plan.metalLevel} />
              </td>
              <td className={`tnum ${TD} text-right text-brown-gravie-50`}>
                {formatCents(plan.ideonPremiumCents)}
              </td>
              <td className={TD}>
                <span
                  className={
                    plan.modifierId === null
                      ? 'text-paragraph-extra-small text-brown-gravie-30'
                      : 'tnum text-paragraph-extra-small font-bold text-brown-gravie-50'
                  }
                  title={plan.modifierLabel ?? undefined}
                >
                  {modifierSummary(plan)}
                </span>
              </td>
              <td className={`tnum ${TD} text-right font-extrabold text-ink-60`}>
                {formatCents(plan.finalPremiumCents)}
              </td>
              <td className={`tnum ${TD} text-right text-brown-gravie-50`}>
                {formatCents(deductibleOf(plan))}
              </td>
              <td className={`tnum ${TD} text-right text-brown-gravie-50`}>
                {formatCents(oopMaxOf(plan))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
