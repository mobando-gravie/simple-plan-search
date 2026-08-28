import { Check, X } from 'lucide-react'
import Image from 'next/image'
import { formatCents } from '@/app/lib/money'
import { allProvidersInNetwork, coversAllDrugs } from '@/app/lib/planFilter'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import { CARD, CHIP } from '@/app/ui/theme'

const METAL_STYLES: Record<string, string> = {
  bronze: 'bg-marketplace-orange-20 text-marketplace-orange-70 border-marketplace-orange-30',
  expanded_bronze:
    'bg-marketplace-orange-20 text-marketplace-orange-70 border-marketplace-orange-30',
  silver: 'bg-ink-10 text-ink-50 border-ink-15',
  gold: 'bg-brown-gravie-10 text-brown-gravie-50 border-brown-gravie-20',
  platinum: 'bg-secondary-green-10 text-secondary-green-70 border-secondary-green-60',
  catastrophic: 'bg-destructive/10 text-destructive border-destructive/30',
}

const STAT_LABEL = 'text-header-h6 uppercase text-brown-gravie-50'
const STAT_VALUE = 'tnum text-header-h3 text-ink-60'

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <div className={STAT_LABEL}>{label}</div>
      <div className={STAT_VALUE}>
        {value}
        {suffix && <span className="text-paragraph-extra-small text-brown-gravie-50">{suffix}</span>}
      </div>
    </div>
  )
}

function CoverageChip({ ok, label }: { ok: boolean; label: string }) {
  const tone = ok
    ? 'border-secondary-green-60 bg-secondary-green-10 text-secondary-green-70'
    : 'border-brown-gravie-20 bg-brown-gravie-10 text-brown-gravie-50'
  return (
    <span className={`${CHIP} ${tone}`}>
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  )
}

export default function PlanList({
  plans,
  householdSize,
}: {
  plans: PricedPlan[]
  householdSize: number
}) {
  if (plans.length === 0) {
    return (
      <p className="text-paragraph-small text-brown-gravie-50">No plans match these filters.</p>
    )
  }

  const family = householdSize > 1
  const costShare = family ? 'family' : 'individual'

  return (
    <ul className="space-y-3">
      {plans.map((plan, i) => {
        const providers = plan.coverage.providers
        const drugs = plan.coverage.drugs
        return (
          <li key={plan.hiosPlanId} className={`${CARD} p-5`}>
            <div className="flex items-start gap-3">
              {/* Rank labels the current sort order, not the plan. */}
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-green-60 text-paragraph-small font-bold text-white">
                {i + 1}
              </span>
              <h3 className="min-w-0 flex-1 text-header-h4 text-ink-60">{plan.planName}</h3>
              {plan.logoUrl ? (
                <Image
                  src={plan.logoUrl}
                  alt={plan.carrierName}
                  width={96}
                  height={32}
                  unoptimized
                  style={{ width: 'auto', height: '2rem' }}
                  className="shrink-0 object-contain"
                />
              ) : (
                <span className="shrink-0 text-paragraph-small text-brown-gravie-50">
                  {plan.carrierName}
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Premium" value={formatCents(plan.finalPremiumCents)} suffix="/mo" />
              <Stat
                label={`Deductible (${costShare})`}
                value={formatCents(
                  family ? plan.deductibleFamilyCents : plan.deductibleIndividualCents,
                )}
              />
              <Stat
                label={`Max OOP (${costShare})`}
                value={formatCents(
                  family ? plan.outOfPocketMaxFamilyCents : plan.outOfPocketMaxIndividualCents,
                )}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {plan.metalLevel && (
                <span
                  className={`${CHIP} capitalize ${METAL_STYLES[plan.metalLevel] ?? 'bg-ink-10 text-ink-50 border-ink-15'}`}
                >
                  {plan.metalLevel.replace('_', ' ')}
                </span>
              )}
              {plan.planType && (
                <span className={`${CHIP} border-ink-15 bg-ink-10 text-ink-50`}>
                  {plan.planType}
                </span>
              )}
              {plan.hsaEligible && (
                <span
                  className={`${CHIP} border-secondary-green-60 bg-secondary-green-10 text-secondary-green-70`}
                >
                  HSA Eligible
                </span>
              )}
              {providers.length > 0 && (
                <CoverageChip
                  ok={allProvidersInNetwork(plan)}
                  label={`${providers.filter((p) => p.inNetwork).length}/${providers.length} providers`}
                />
              )}
              {drugs.length > 0 && (
                <CoverageChip
                  ok={coversAllDrugs(plan)}
                  label={`${drugs.filter((d) => d.covered).length}/${drugs.length} drugs`}
                />
              )}
              <span className="ml-auto font-mono text-paragraph-extra-small text-brown-gravie-30">
                {plan.hiosPlanId}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
