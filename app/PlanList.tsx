'use client'
import Image from 'next/image'
import { countCovered, countInNetwork, coverageMatch } from '@/app/lib/ideon/coverage'
import type { SelectedDrug, SelectedProvider } from '@/app/lib/ideon/types'
import { formatCents, netPremiumCents } from '@/app/lib/money'
import { sbcUrl } from '@/app/lib/planBenefits'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import PlanDetailsModal from '@/app/PlanDetailsModal'
import {
  benefitTooltip,
  metalTooltip,
  planTypeTooltip,
  TOOLTIP_COPY,
} from '@/app/lib/tooltipCopy'
import { Button } from '@/app/ui/Button'
import { Chip, metalTone, TONE_BY_MATCH } from '@/app/ui/Chip'
import { TEXT } from '@/app/ui/colors'
import { DocLink } from '@/app/ui/DocLink'
import InfoTooltip, { Tip } from '@/app/ui/InfoTooltip'
import { EmptyState, Muted } from '@/app/ui/Text'
import { CARD, CARD_HEADER, EYEBROW, FAINT_XS, FIGURE, MUTED } from '@/app/ui/theme'

const STAT_LABEL = `flex items-center gap-1 ${EYEBROW}`
const STAT_VALUE = `mt-1 whitespace-nowrap ${FIGURE}`
const STAT_SUB = `tnum mt-1 whitespace-nowrap ${MUTED} underline decoration-dotted underline-offset-2`
/** Each stat column but the first is separated by a rule, once the grid kicks in. */
const STAT_COL =
  'min-w-0 sm:border-l sm:border-brown-gravie-20 sm:px-4 sm:first:border-l-0 sm:first:pl-0 ' +
  'lg:px-5 lg:first:border-l lg:first:pl-5'

function Stat({
  label,
  tooltip,
  value,
  strikethrough,
  suffix,
  sub,
  subTooltip,
}: {
  label: string
  tooltip: string
  value: string
  strikethrough?: string
  suffix?: string
  sub?: string
  subTooltip?: string
}) {
  return (
    <div>
      <div className={STAT_LABEL}>
        {label}
        <InfoTooltip copy={tooltip} />
      </div>
      <div className={STAT_VALUE}>
        {value}
        {suffix && <span className={MUTED}>{suffix}</span>}
        {strikethrough && (
          <span className="ml-2 text-paragraph-regular font-bold text-destructive line-through">
            {strikethrough}
          </span>
        )}
      </div>
      {sub && (
        <div className={STAT_SUB}>
          {sub}
          {subTooltip && (
            <span className="ml-1 inline-flex align-middle no-underline">
              <InfoTooltip copy={subTooltip} />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default function PlanList({
  plans,
  allPlans,
  openPlanId,
  onOpenPlan,
  allowanceCents = 0,
  providers = [],
  drugs = [],
}: {
  plans: PricedPlan[]
  /** Unfiltered, so a shared link to a plan opens even when the filters would hide it. */
  allPlans: PricedPlan[]
  openPlanId: string | null
  onOpenPlan: (hiosPlanId: string | null) => void
  allowanceCents?: number
  /** What the member asked about — the coverage denominator, not Ideon's answer. */
  providers?: SelectedProvider[]
  drugs?: SelectedDrug[]
}) {
  const openPlan = allPlans.find((p) => p.hiosPlanId === openPlanId) ?? null

  const hasAllowance = allowanceCents > 0
  // Rendered in both branches: a shared link can name a plan the filters it carries
  // would otherwise hide.
  const modal = openPlan && (
    <PlanDetailsModal
      plan={openPlan}
      providers={providers}
      drugs={drugs}
      onClose={() => onOpenPlan(null)}
    />
  )

  if (plans.length === 0) {
    return (
      <>
        <EmptyState>No plans match these filters.</EmptyState>
        {modal}
      </>
    )
  }

  return (
    <>
      <ul className="space-y-4">
        {plans.map((plan) => {
          const inNetwork = countInNetwork(providers, plan.coverage)
          const covered = countCovered(drugs, plan.coverage)
          const easyEnroll = plan.enrollmentType === 'EASY_ENROLL'
          const sbc = sbcUrl(plan.documents)

          return (
            <li key={plan.hiosPlanId} className={`${CARD} overflow-hidden`}>
              <div className={`${CARD_HEADER} items-center px-4 py-3 sm:px-5`}>
                {plan.logoUrl ? (
                  <Image
                    src={plan.logoUrl}
                    alt={plan.carrierName}
                    width={96}
                    height={32}
                    unoptimized
                    className="h-8 w-auto max-w-24 shrink-0 object-contain grayscale mix-blend-multiply"
                  />
                ) : (
                  <Muted as="span" className="shrink-0">
                    {plan.carrierName}
                  </Muted>
                )}
                <h3 className={`min-w-0 flex-1 text-header-h4 ${TEXT.heading}`}>{plan.planName}</h3>
                <span className={`hidden shrink-0 font-mono ${FAINT_XS} sm:inline`}>{plan.hiosPlanId}</span>
              </div>

              {/* Tags, three stats, actions. The stats are their own grid until lg, where
                  `contents` dissolves it so all five land in one row. */}
              <div className="grid grid-cols-1 items-start gap-5 p-4 sm:p-5 lg:grid-cols-[12rem_1fr_1fr_1fr_auto] lg:gap-0">
                <div className="flex flex-wrap gap-1.5 lg:pr-5">
                  <Tip copy={easyEnroll ? TOOLTIP_COPY.easyEnroll : TOOLTIP_COPY.selfEnroll}>
                    <Chip tone={easyEnroll ? 'orange' : 'neutral'}>
                      {easyEnroll ? '♥ Easy Enroll' : 'Self Enroll'}
                    </Chip>
                  </Tip>
                  <Tip copy={plan.offMarket ? TOOLTIP_COPY.preTax : TOOLTIP_COPY.postTax}>
                    <Chip>{plan.offMarket ? 'Pre-tax' : 'Post-tax'}</Chip>
                  </Tip>
                  {plan.metalLevel && (
                    <Tip copy={TOOLTIP_COPY[metalTooltip(plan.metalLevel)]}>
                      <Chip tone={metalTone(plan.metalLevel)} className="capitalize">
                        {plan.metalLevel.replace('_', ' ')}
                      </Chip>
                    </Tip>
                  )}
                  {plan.planType && (
                    <Tip copy={TOOLTIP_COPY[planTypeTooltip(plan.planType)]}>
                      <Chip>{plan.planType}</Chip>
                    </Tip>
                  )}
                  {plan.hsaEligible && (
                    <Tip copy={TOOLTIP_COPY.hsa}>
                      <Chip>HSA</Chip>
                    </Tip>
                  )}
                  {providers.length > 0 && (
                    <Tip copy={TOOLTIP_COPY.providers}>
                      <Chip tone={TONE_BY_MATCH[coverageMatch(inNetwork, providers.length)]}>
                        Providers {inNetwork} of {providers.length}
                      </Chip>
                    </Tip>
                  )}
                  {drugs.length > 0 && (
                    <Tip copy={TOOLTIP_COPY.prescriptions}>
                      <Chip tone={TONE_BY_MATCH[coverageMatch(covered, drugs.length)]}>
                        Prescriptions {covered} of {drugs.length}
                      </Chip>
                    </Tip>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0 lg:contents">
                <div className={STAT_COL}>
                  <Stat
                    label={hasAllowance ? 'Your Monthly Premium' : 'Premium'}
                    tooltip={TOOLTIP_COPY.premium}
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
                    subTooltip={
                      hasAllowance ? benefitTooltip(formatCents(allowanceCents)) : undefined
                    }
                  />
                </div>

                <div className={STAT_COL}>
                  <Stat
                    label="Deductible"
                    tooltip={TOOLTIP_COPY.deductible}
                    value={formatCents(plan.deductibleIndividualCents)}
                    suffix=" / person"
                    sub={
                      plan.deductibleFamilyCents === null
                        ? undefined
                        : `${formatCents(plan.deductibleFamilyCents)} / household`
                    }
                    subTooltip={TOOLTIP_COPY.perHousehold}
                  />
                </div>

                <div className={STAT_COL}>
                  <Stat
                    label="Out-of-Pocket Max"
                    tooltip={TOOLTIP_COPY.outOfPocket}
                    value={formatCents(plan.outOfPocketMaxIndividualCents)}
                    suffix=" / person"
                    sub={
                      plan.outOfPocketMaxFamilyCents === null
                        ? undefined
                        : `${formatCents(plan.outOfPocketMaxFamilyCents)} / household`
                    }
                    subTooltip={TOOLTIP_COPY.perHousehold}
                  />
                </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brown-gravie-20 pt-4 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <Button type="button" variant="outline" onClick={() => onOpenPlan(plan.hiosPlanId)}>
                    Details
                  </Button>
                  {sbc && (
                    <DocLink href={sbc} size="sm">
                      Summary of Benefits
                    </DocLink>
                  )}
                  <span className={`font-mono ${FAINT_XS} sm:hidden`}>{plan.hiosPlanId}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {modal}
    </>
  )
}
