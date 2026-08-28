'use client'
import Image from 'next/image'
import { coverageMatch } from '@/app/lib/ideon/coverage'
import type { SelectedDrug } from '@/app/lib/ideon/types'
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
import { CARD, CARD_HEADER, FAINT_XS, MUTED } from '@/app/ui/theme'

const STAT_LABEL = `flex items-center gap-1 text-header-h5 uppercase ${TEXT.muted}`
const STAT_VALUE = `tnum mt-2 whitespace-nowrap text-header-h2 ${TEXT.heading}`
const STAT_SUB = `tnum mt-1 whitespace-nowrap ${MUTED} underline`
/** Each stat column but the first is separated by a rule, once the grid kicks in. */
const STAT_COL = 'lg:border-l lg:border-brown-gravie-20'

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
    <div className="px-5">
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
  drugs = [],
}: {
  plans: PricedPlan[]
  /** Unfiltered, so a shared link to a plan opens even when the filters would hide it. */
  allPlans: PricedPlan[]
  openPlanId: string | null
  onOpenPlan: (hiosPlanId: string | null) => void
  allowanceCents?: number
  drugs?: SelectedDrug[]
}) {
  const openPlan = allPlans.find((p) => p.hiosPlanId === openPlanId) ?? null

  const hasAllowance = allowanceCents > 0
  // Rendered in both branches: a shared link can name a plan the filters it carries
  // would otherwise hide.
  const modal = openPlan && (
    <PlanDetailsModal plan={openPlan} drugs={drugs} onClose={() => onOpenPlan(null)} />
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
          const providers = plan.coverage.providers
          const planDrugs = plan.coverage.drugs
          const inNetwork = providers.filter((p) => p.inNetwork).length
          const covered = planDrugs.filter((d) => d.covered).length
          const easyEnroll = plan.enrollmentType === 'EASY_ENROLL'
          const sbc = sbcUrl(plan.documents)

          return (
            <li key={plan.hiosPlanId} className={`${CARD} overflow-hidden`}>
              <div className={`${CARD_HEADER} items-center px-5 py-3`}>
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
              </div>

              <div className="grid grid-cols-1 items-start gap-4 p-5 lg:grid-cols-[12rem_1fr_1fr_1fr_auto] lg:gap-0">
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
                  {planDrugs.length > 0 && (
                    <Tip copy={TOOLTIP_COPY.prescriptions}>
                      <Chip tone={TONE_BY_MATCH[coverageMatch(covered, planDrugs.length)]}>
                        Prescriptions {covered} of {planDrugs.length}
                      </Chip>
                    </Tip>
                  )}
                </div>

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

                <div className={`flex flex-col items-start gap-2 lg:items-end lg:pl-5 ${STAT_COL}`}>
                  {sbc && (
                    <DocLink href={sbc} size="sm">
                      Summary of Benefits
                    </DocLink>
                  )}
                  <Button type="button" variant="outline" onClick={() => onOpenPlan(plan.hiosPlanId)}>
                    Details
                  </Button>
                  <span className={`font-mono ${FAINT_XS}`}>{plan.hiosPlanId}</span>
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
