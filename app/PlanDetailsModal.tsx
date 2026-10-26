'use client'
import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSwr } from '@/app/lib/swr/useSwr'
import {
  ADDITIONAL_COVERAGES,
  benefitValues,
  CARE_SERVICES,
  formatTier,
  PRESCRIPTION_COVERAGE,
  type BenefitRow,
} from '@/app/lib/planBenefits'
import { coverageOf, drugKey, type DrugCoverage } from '@/app/lib/ideon/coverage'
import type { SelectedDrug, SelectedProvider } from '@/app/lib/ideon/types'
import { formatCents } from '@/app/lib/money'
import { sbcUrl } from '@/app/lib/planBenefits'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import { Button, IconButton } from '@/app/ui/Button'
import { BG, BORDER, TEXT } from '@/app/ui/colors'
import { DocLink } from '@/app/ui/DocLink'
import { Figure, FigureStrip } from '@/app/ui/Figure'
import { Muted } from '@/app/ui/Text'
import {
  CARD_HEADER,
  DIVIDED_LIST,
  FAINT,
  LINK,
  MUTED,
  MUTED_XS,
  SECTION_TITLE,
} from '@/app/ui/theme'

const MODAL_PAD = 'px-4 sm:px-6'

/** What gates the prescription beyond the tier. All three are what Ideon reports. */
function requirementsOf(cover: DrugCoverage): string[] {
  const out: string[] = []
  if (cover.priorAuthorization) out.push('Prior authorization')
  if (cover.quantityLimit) out.push('Quantity limit')
  if (cover.stepTherapy) out.push('Step therapy')
  return out
}

/** Capitalised for display — Ideon sends `individual` / `organization` lower case. */
function describeProvider(provider: SelectedProvider): string {
  const kind = provider.type ? provider.type[0].toUpperCase() + provider.type.slice(1) : null
  return [kind, provider.specialty, provider.city].filter(Boolean).join(' · ')
}

function BenefitTable({
  benefits,
  rows,
}: {
  benefits: PricedPlan['benefits']
  rows: BenefitRow[]
}) {
  const values = benefitValues(benefits, rows)
  if (values.length === 0) {
    return <p className={FAINT}>Not published for this plan.</p>
  }
  return (
    <ul className={DIVIDED_LIST}>
      {values.map((v) => (
        <li key={v.label} className="grid grid-cols-1 gap-x-6 gap-y-1 py-3 sm:grid-cols-[1fr_1fr]">
          <span className={`min-w-0 text-paragraph-regular ${TEXT.body}`}>{v.label}</span>
          <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-paragraph-small ${TEXT.heading}`}>
            <dt className={`whitespace-nowrap ${TEXT.muted}`}>In network</dt>
            <dd className="min-w-0">{v.inNetwork}</dd>
            <dt className={`whitespace-nowrap ${TEXT.muted}`}>Out of network</dt>
            <dd className="min-w-0">{v.outOfNetwork}</dd>
          </dl>
        </li>
      ))}
    </ul>
  )
}

type Availability = {
  state: string
  serviceAreaId: string
  planYear: number
  counties: { fips: string; name: string | null }[]
}

/** Counties the plan is sold in (CMS Service Area PUF). Hidden when not covered (FFM only). */
function AvailabilitySection({ hiosPlanId }: { hiosPlanId: string }) {
  const { data, error } = useSwr<Availability>(`/api/plans/${encodeURIComponent(hiosPlanId)}/availability`)
  const [expanded, setExpanded] = useState(false)
  if (error || !data || data.counties.length === 0) return null

  const shown = expanded ? data.counties : data.counties.slice(0, 12)
  return (
    <section className="space-y-3">
      <h3 className={SECTION_TITLE}>Where it&apos;s sold</h3>
      <Muted>
        {data.counties.length} {data.counties.length === 1 ? 'county' : 'counties'} · plan year{' '}
        {data.planYear} (CMS Service Area PUF)
      </Muted>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((c) => (
          <span key={c.fips} className={`rounded-xs ${BG.neutral} px-2 py-0.5 text-paragraph-small`}>
            {c.name ?? c.fips}
          </span>
        ))}
      </div>
      {data.counties.length > 12 && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className={`text-paragraph-small ${LINK}`}>
          {expanded ? 'Show fewer' : `Show all ${data.counties.length}`}
        </button>
      )}
    </section>
  )
}

export default function PlanDetailsModal({
  plan,
  providers,
  drugs,
  onClose,
}: {
  plan: PricedPlan
  providers: SelectedProvider[]
  drugs: SelectedDrug[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  // showModal() rather than the `open` attribute: it is what gives the backdrop,
  // Escape-to-close and the focus trap without a modal library.
  //
  // No close() in the cleanup. close() fires the dialog's `close` event, which is
  // wired to onClose — and StrictMode double-invokes effects in dev, so the
  // teardown between the two runs closed the modal the instant it opened, with no
  // error to show for it. Unmounting removes the element, which is enough.
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const sbc = sbcUrl(plan.documents)

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="plan-details-title"
      className={`m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-sm ${BG.surface} p-0 backdrop:bg-ink-60/40`}
    >
      <div className={`sticky top-0 z-10 items-start py-4 ${MODAL_PAD} ${CARD_HEADER}`}>
        <div className="min-w-0 flex-1">
          <h2 id="plan-details-title" className={`text-header-h4 sm:text-header-h3 ${TEXT.heading}`}>
            {plan.planName}
          </h2>
          <Muted>
            {plan.carrierName} · <span className="font-mono">{plan.hiosPlanId}</span>
          </Muted>
        </div>
        <IconButton label="Close" size="lg" onClick={onClose} className="-mr-1.5">
          <X />
        </IconButton>
      </div>

      <div className={`space-y-8 py-6 ${MODAL_PAD}`}>
        <section className={`rounded-sm border p-4 ${BORDER.subtle}`}>
          <h3 className="sr-only">Cost sharing</h3>
          <FigureStrip>
            <Figure
              label="Deductible"
              value={formatCents(plan.deductibleIndividualCents)}
              detail={`per person · ${formatCents(plan.deductibleFamilyCents)} household`}
            />
            <Figure
              label="Out-of-pocket max"
              value={formatCents(plan.outOfPocketMaxIndividualCents)}
              detail={`per person · ${formatCents(plan.outOfPocketMaxFamilyCents)} household`}
            />
          </FigureStrip>
        </section>

        {(sbc || plan.formularyUrl) && (
          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Documents</h3>
            <div className="flex flex-wrap gap-6">
              {sbc && <DocLink href={sbc}>Summary of Benefits and Coverage</DocLink>}
              {plan.formularyUrl && (
                <DocLink href={plan.formularyUrl}>Prescription List</DocLink>
              )}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h3 className={SECTION_TITLE}>Care Services</h3>
          <BenefitTable benefits={plan.benefits} rows={CARE_SERVICES} />
        </section>

        <AvailabilitySection hiosPlanId={plan.hiosPlanId} />

        {providers.length > 0 && (
          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Your Providers</h3>
            <ul className={DIVIDED_LIST}>
              {providers.map((provider) => {
                // Read from the requested list, same rule as the card's chip: a provider
                // Ideon returned no row for is out of network, not missing.
                const inNetwork = plan.coverage.providers.some(
                  (p) => p.npi === provider.npi && p.inNetwork,
                )
                const detail = describeProvider(provider)
                return (
                  <li
                    key={provider.npi}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <span className="min-w-0">
                      <span className={`block text-paragraph-regular ${TEXT.body}`}>
                        {provider.name}
                      </span>
                      {detail && <span className={`block ${MUTED_XS}`}>{detail}</span>}
                    </span>
                    <span className="shrink-0 text-right">
                      {inNetwork ? (
                        <span
                          className={`inline-flex items-center gap-1 text-paragraph-small font-bold ${TEXT.positive} [&_svg]:size-4`}
                        >
                          <Check />
                          In network
                        </span>
                      ) : (
                        <span className={MUTED}>Out of network</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {drugs.length > 0 && (
          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Your Prescriptions</h3>
            <ul className={DIVIDED_LIST}>
              {drugs.map((drug) => {
                const cover = coverageOf(drug, plan.coverage)
                return (
                  <li key={drugKey(drug)} className="flex items-start justify-between gap-4 py-3">
                    <span className={`text-paragraph-regular ${TEXT.body}`}>{drug.name}</span>
                    <span className="shrink-0 text-right">
                      {cover?.covered ? (
                        <span
                          className={`inline-flex items-center gap-1 text-paragraph-small font-bold ${TEXT.positive} [&_svg]:size-4`}
                        >
                          <Check />
                          Covered
                        </span>
                      ) : (
                        <span className={MUTED}>Not covered</span>
                      )}
                      <span className={`block ${MUTED_XS}`}>
                        {drug.ndcs.length === 0
                          ? 'identifier did not resolve'
                          : formatTier(cover?.tier ?? null)}
                      </span>
                      {cover && requirementsOf(cover).length > 0 && (
                        <span className={`block font-bold ${MUTED_XS}`}>
                          {requirementsOf(cover).join(' · ')}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h3 className={SECTION_TITLE}>Prescription Coverage</h3>
          <BenefitTable benefits={plan.benefits} rows={PRESCRIPTION_COVERAGE} />
        </section>

        <section className="space-y-3">
          <h3 className={SECTION_TITLE}>Additional Coverages</h3>
          <BenefitTable benefits={plan.benefits} rows={ADDITIONAL_COVERAGES} />
        </section>

      </div>

      <div className={`sticky bottom-0 flex justify-end border-t py-3 ${MODAL_PAD} ${BORDER.subtle} ${BG.surface}`}>
        <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </div>
    </dialog>
  )
}
