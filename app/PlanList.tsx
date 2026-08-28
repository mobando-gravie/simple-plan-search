'use client'
import { FileText, Info } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { coverageMatch, type CoverageMatch } from '@/app/lib/ideon/coverage'
import type { SelectedDrug } from '@/app/lib/ideon/types'
import { formatCents, netPremiumCents } from '@/app/lib/money'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import PlanDetailsModal from '@/app/PlanDetailsModal'
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

const NEUTRAL_CHIP = 'border-ink-15 bg-ink-10 text-ink-50'

/** match / partial / none, as member-client's coverage-match-class. */
const MATCH_STYLES: Record<CoverageMatch, string> = {
  match: 'border-secondary-green-60 bg-secondary-green-10 text-secondary-green-70',
  partial: 'border-marketplace-orange-30 bg-marketplace-orange-20 text-marketplace-orange-70',
  none: 'border-brown-gravie-20 bg-brown-gravie-10 text-brown-gravie-50',
}

const STAT_LABEL = 'flex items-center gap-1 text-header-h5 uppercase text-brown-gravie-50'
const STAT_VALUE = 'tnum mt-2 whitespace-nowrap text-header-h2 text-ink-60'
const STAT_SUB = 'tnum mt-1 whitespace-nowrap text-paragraph-small text-brown-gravie-50 underline'

function Stat({
  label,
  tooltip,
  value,
  strikethrough,
  suffix,
  sub,
}: {
  label: string
  tooltip: string
  value: string
  strikethrough?: string
  suffix?: string
  sub?: string
}) {
  return (
    <div className="px-5">
      <div className={STAT_LABEL}>
        {label}
        <Info className="h-3.5 w-3.5 text-brown-gravie-30" aria-label={tooltip} />
      </div>
      <div className={STAT_VALUE}>
        {value}
        {suffix && <span className="text-paragraph-small text-brown-gravie-50">{suffix}</span>}
        {strikethrough && (
          <span className="ml-2 text-paragraph-regular font-bold text-destructive line-through">
            {strikethrough}
          </span>
        )}
      </div>
      {sub && <div className={STAT_SUB}>{sub}</div>}
    </div>
  )
}

export default function PlanList({
  plans,
  allowanceCents = 0,
  drugs = [],
}: {
  plans: PricedPlan[]
  allowanceCents?: number
  drugs?: SelectedDrug[]
}) {
  const [openPlan, setOpenPlan] = useState<PricedPlan | null>(null)

  if (plans.length === 0) {
    return <p className="text-paragraph-small text-brown-gravie-50">No plans match these filters.</p>
  }

  const hasAllowance = allowanceCents > 0

  return (
    <>
      <ul className="space-y-4">
        {plans.map((plan) => {
          const providers = plan.coverage.providers
          const planDrugs = plan.coverage.drugs
          const inNetwork = providers.filter((p) => p.inNetwork).length
          const covered = planDrugs.filter((d) => d.covered).length
          const easyEnroll = plan.enrollmentType === 'EASY_ENROLL'
          const sbc =
            plan.documents.find((d) => d.type === 'summary_of_benefits_and_coverage')?.url ??
            plan.documents[0]?.url ??
            null

          return (
            <li key={plan.hiosPlanId} className={`${CARD} overflow-hidden`}>
              <div className="flex items-center gap-3 border-b border-brown-gravie-20 bg-brown-gravie-10 px-5 py-3">
                {plan.logoUrl ? (
                  <Image
                    src={plan.logoUrl}
                    alt={plan.carrierName}
                    width={96}
                    height={32}
                    unoptimized
                    style={{ width: 'auto', height: '2rem', maxWidth: '100px' }}
                    className="shrink-0 object-contain grayscale"
                  />
                ) : (
                  <span className="shrink-0 text-paragraph-small text-brown-gravie-50">
                    {plan.carrierName}
                  </span>
                )}
                <h3 className="min-w-0 flex-1 text-header-h4 text-ink-60">{plan.planName}</h3>
              </div>

              <div className="grid grid-cols-1 items-start gap-4 p-5 lg:grid-cols-[12rem_1fr_1fr_1fr_auto] lg:gap-0">
                <div className="flex flex-wrap gap-1.5 lg:pr-5">
                  <span
                    className={`${CHIP} ${
                      easyEnroll
                        ? 'border-marketplace-orange-30 bg-marketplace-orange-20 text-marketplace-orange-70'
                        : NEUTRAL_CHIP
                    }`}
                  >
                    {easyEnroll ? '♥ Easy Enroll' : 'Self Enroll'}
                  </span>
                  <span className={`${CHIP} ${NEUTRAL_CHIP}`}>
                    {plan.offMarket ? 'Pre-tax' : 'Post-tax'}
                  </span>
                  {plan.metalLevel && (
                    <span
                      className={`${CHIP} capitalize ${METAL_STYLES[plan.metalLevel] ?? NEUTRAL_CHIP}`}
                    >
                      {plan.metalLevel.replace('_', ' ')}
                    </span>
                  )}
                  {plan.planType && (
                    <span className={`${CHIP} ${NEUTRAL_CHIP}`}>{plan.planType}</span>
                  )}
                  {plan.hsaEligible && <span className={`${CHIP} ${NEUTRAL_CHIP}`}>HSA</span>}
                  {providers.length > 0 && (
                    <span className={`${CHIP} ${MATCH_STYLES[coverageMatch(inNetwork, providers.length)]}`}>
                      Providers {inNetwork} of {providers.length}
                    </span>
                  )}
                  {planDrugs.length > 0 && (
                    <span className={`${CHIP} ${MATCH_STYLES[coverageMatch(covered, planDrugs.length)]}`}>
                      Prescriptions {covered} of {planDrugs.length}
                    </span>
                  )}
                </div>

                <div className="lg:border-l lg:border-brown-gravie-20">
                  <Stat
                    label={hasAllowance ? 'Your Monthly Premium' : 'Premium'}
                    tooltip="Monthly premium after the Gravie modifier, less any allowance."
                    value={formatCents(
                      hasAllowance
                        ? netPremiumCents(plan.finalPremiumCents, allowanceCents)
                        : plan.finalPremiumCents,
                    )}
                    suffix="/mo"
                    strikethrough={
                      hasAllowance && plan.finalPremiumCents !== null
                        ? formatCents(plan.finalPremiumCents)
                        : undefined
                    }
                    sub={hasAllowance ? `after ${formatCents(allowanceCents)} benefit` : undefined}
                  />
                </div>

                <div className="lg:border-l lg:border-brown-gravie-20">
                  <Stat
                    label="Deductible"
                    tooltip="What you pay before the plan starts sharing costs."
                    value={formatCents(plan.deductibleIndividualCents)}
                    suffix=" / person"
                    sub={
                      plan.deductibleFamilyCents === null
                        ? undefined
                        : `${formatCents(plan.deductibleFamilyCents)} / household`
                    }
                  />
                </div>

                <div className="lg:border-l lg:border-brown-gravie-20">
                  <Stat
                    label="Out-of-Pocket Max"
                    tooltip="The most you pay in a year before the plan covers everything."
                    value={formatCents(plan.outOfPocketMaxIndividualCents)}
                    suffix=" / person"
                    sub={
                      plan.outOfPocketMaxFamilyCents === null
                        ? undefined
                        : `${formatCents(plan.outOfPocketMaxFamilyCents)} / household`
                    }
                  />
                </div>

                <div className="flex flex-col items-start gap-2 lg:items-end lg:border-l lg:border-brown-gravie-20 lg:pl-5">
                  {sbc && (
                    <a
                      href={sbc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-paragraph-small text-marketplace-orange-60 underline hover:text-marketplace-orange-70"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Summary of Benefits
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpenPlan(plan)}
                    className="rounded-xs border border-marketplace-orange-50 bg-white px-4 py-1.5 text-sm font-bold text-marketplace-orange-60 transition-colors hover:bg-marketplace-orange-10"
                  >
                    Details
                  </button>
                  <span className="font-mono text-paragraph-extra-small text-brown-gravie-30">
                    {plan.hiosPlanId}
                  </span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {openPlan && (
        <PlanDetailsModal plan={openPlan} drugs={drugs} onClose={() => setOpenPlan(null)} />
      )}
    </>
  )
}
