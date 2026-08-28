'use client'
import { Check, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import {
  ADDITIONAL_COVERAGES,
  benefitValues,
  CARE_SERVICES,
  formatTier,
  PRESCRIPTION_COVERAGE,
  type BenefitRow,
} from '@/app/lib/planBenefits'
import type { SelectedDrug } from '@/app/lib/ideon/types'
import { formatCents } from '@/app/lib/money'
import { sbcUrl } from '@/app/lib/planBenefits'
import type { PricedPlan } from '@/app/lib/services/planSearch'
import { Button, IconButton } from '@/app/ui/Button'
import { BG, TEXT } from '@/app/ui/colors'
import { DocLink } from '@/app/ui/DocLink'
import { Muted } from '@/app/ui/Text'
import {
  CARD_HEADER,
  DIVIDED_LIST,
  FAINT,
  DIVIDED_TOP,
  MUTED,
  MUTED_XS,
  SECTION_TITLE,
} from '@/app/ui/theme'

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
      {values.map((v, i) => (
        <li
          key={v.label}
          className={`grid grid-cols-1 gap-1 px-3 py-3 sm:grid-cols-2 ${
            i % 2 === 1 ? 'bg-brown-gravie-5' : ''
          }`}
        >
          <span className={`text-paragraph-regular ${TEXT.body}`}>{v.label}</span>
          <span className={`text-paragraph-small ${TEXT.heading}`}>
            <span className="block">
              <span className={TEXT.muted}>In Network · </span>
              {v.inNetwork}
            </span>
            <span className="block">
              <span className={TEXT.muted}>Out of Network · </span>
              {v.outOfNetwork}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function PlanDetailsModal({
  plan,
  drugs,
  onClose,
}: {
  plan: PricedPlan
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
      className={`m-auto w-full max-w-3xl rounded-sm ${BG.surface} p-0 backdrop:bg-ink-60/40`}
    >
      <div className={`sticky top-0 items-start px-6 py-4 ${CARD_HEADER}`}>
        <div className="min-w-0 flex-1">
          <h2 className={SECTION_TITLE}>{plan.planName}</h2>
          <Muted>
            {plan.carrierName} · <span className="font-mono">{plan.hiosPlanId}</span>
          </Muted>
        </div>
        <IconButton label="Close" size="lg" onClick={onClose}>
          <X />
        </IconButton>
      </div>

      <div className="space-y-8 px-6 py-6">
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

        {drugs.length > 0 && (
          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Your Prescriptions</h3>
            <ul className={DIVIDED_LIST}>
              {drugs.map((drug) => {
                const cover = plan.coverage.drugs.find((d) => d.ndc === drug.ndc)
                return (
                  <li key={drug.medId} className="flex items-start justify-between gap-4 py-3">
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
                      <span className={`block ${MUTED_XS}`}>{formatTier(cover?.tier ?? null)}</span>
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

        <section className={`space-y-1 pt-4 ${DIVIDED_TOP}`}>
          <h3 className={SECTION_TITLE}>Cost sharing</h3>
          <Muted className="tnum">
            Deductible {formatCents(plan.deductibleIndividualCents)} / person ·{' '}
            {formatCents(plan.deductibleFamilyCents)} / household
          </Muted>
          <Muted className="tnum">
            Max OOP {formatCents(plan.outOfPocketMaxIndividualCents)} / person ·{' '}
            {formatCents(plan.outOfPocketMaxFamilyCents)} / household
          </Muted>
        </section>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </dialog>
  )
}
