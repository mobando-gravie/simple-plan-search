import { formatCents, formatCentsDelta } from '@/app/lib/money'
import type { PricedPlan } from '@/app/lib/services/planSearch'

const METAL_STYLES: Record<string, string> = {
  bronze: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  expanded_bronze: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  silver: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  gold: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  platinum: 'bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
  catastrophic: 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
}

function MetalBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-zinc-400">—</span>
  const style = METAL_STYLES[level] ?? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800'
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {level.replace('_', ' ')}
    </span>
  )
}

function modifierSummary(plan: PricedPlan): string {
  if (plan.modifierId === null) return 'unmodified'
  const parts: string[] = []
  if (plan.gravieMultiplier !== 1) parts.push(`×${plan.gravieMultiplier}`)
  if (plan.gravieFlatCents !== 0) parts.push(formatCentsDelta(plan.gravieFlatCents))
  return parts.length > 0 ? parts.join(' ') : 'identity'
}

export default function PlanTable({
  plans,
  householdSize,
}: {
  plans: PricedPlan[]
  householdSize: number
}) {
  if (plans.length === 0) {
    return <p className="text-sm text-zinc-500">No plans matched this search.</p>
  }

  const family = householdSize > 1
  const costShareLabel = family ? 'family' : 'individual'
  const deductibleOf = (p: PricedPlan) =>
    family ? p.deductibleFamilyCents : p.deductibleIndividualCents
  const oopMaxOf = (p: PricedPlan) =>
    family ? p.outOfPocketMaxFamilyCents : p.outOfPocketMaxIndividualCents

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Plan</th>
            <th className="px-4 py-3 text-left font-medium">Metal</th>
            <th className="px-4 py-3 text-right font-medium">Ideon</th>
            <th className="px-4 py-3 text-left font-medium">Modifier</th>
            <th className="px-4 py-3 text-right font-medium">Gravie premium</th>
            <th className="px-4 py-3 text-right font-medium">Deductible ({costShareLabel})</th>
            <th className="px-4 py-3 text-right font-medium">OOP max ({costShareLabel})</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
          {plans.map((plan) => (
            <tr key={plan.hiosPlanId} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
              <td className="max-w-md px-4 py-3">
                <div className="truncate font-medium" title={plan.planName}>
                  {plan.planName}
                </div>
                <div className="mt-0.5 flex gap-2 text-xs text-zinc-500">
                  <span>{plan.carrierName}</span>
                  <span className="font-mono">{plan.hiosPlanId}</span>
                  {plan.planType && <span>{plan.planType}</span>}
                  {plan.hsaEligible && <span className="text-emerald-600">HSA</span>}
                </div>
              </td>
              <td className="px-4 py-3">
                <MetalBadge level={plan.metalLevel} />
              </td>
              <td className="tnum px-4 py-3 text-right text-zinc-500">
                {formatCents(plan.ideonPremiumCents)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    plan.modifierId === null
                      ? 'text-xs text-zinc-400'
                      : 'tnum text-xs text-zinc-700 dark:text-zinc-300'
                  }
                  title={plan.modifierLabel ?? undefined}
                >
                  {modifierSummary(plan)}
                </span>
              </td>
              <td className="tnum px-4 py-3 text-right font-medium">
                {formatCents(plan.finalPremiumCents)}
              </td>
              <td className="tnum px-4 py-3 text-right text-zinc-500">
                {formatCents(deductibleOf(plan))}
              </td>
              <td className="tnum px-4 py-3 text-right text-zinc-500">
                {formatCents(oopMaxOf(plan))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
