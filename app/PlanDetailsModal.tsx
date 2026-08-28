'use client'
import { Check, FileText, X } from 'lucide-react'
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
import type { PricedPlan } from '@/app/lib/services/planSearch'
import { BTN_OUTLINE } from '@/app/ui/theme'

const SECTION = 'text-header-h3 text-ink-60'
const LINK =
  'inline-flex items-center gap-2 text-paragraph-regular text-marketplace-orange-60 underline hover:text-marketplace-orange-70'

function BenefitTable({
  benefits,
  rows,
}: {
  benefits: PricedPlan['benefits']
  rows: BenefitRow[]
}) {
  const values = benefitValues(benefits, rows)
  if (values.length === 0) {
    return <p className="text-paragraph-small text-brown-gravie-30">Not published for this plan.</p>
  }
  return (
    <ul className="divide-y divide-brown-gravie-20">
      {values.map((v, i) => (
        <li
          key={v.label}
          className={`grid grid-cols-1 gap-1 px-3 py-3 sm:grid-cols-2 ${
            i % 2 === 1 ? 'bg-brown-gravie-5' : ''
          }`}
        >
          <span className="text-paragraph-regular text-ink-50">{v.label}</span>
          <span className="text-paragraph-small text-ink-60">
            <span className="block">
              <span className="text-brown-gravie-50">In Network · </span>
              {v.inNetwork}
            </span>
            <span className="block">
              <span className="text-brown-gravie-50">Out of Network · </span>
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

  const sbc =
    plan.documents.find((d) => d.type === 'summary_of_benefits_and_coverage')?.url ??
    plan.documents[0]?.url ??
    null

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="m-auto w-full max-w-3xl rounded-sm bg-white p-0 backdrop:bg-ink-60/40"
    >
      <div className="sticky top-0 flex items-start gap-3 border-b border-brown-gravie-20 bg-brown-gravie-10 px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-header-h3 text-ink-60">{plan.planName}</h2>
          <p className="text-paragraph-small text-brown-gravie-50">
            {plan.carrierName} · <span className="font-mono">{plan.hiosPlanId}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-xs p-1 text-brown-gravie-50 transition-colors hover:text-destructive"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-8 px-6 py-6">
        {(sbc || plan.formularyUrl) && (
          <section className="space-y-3">
            <h3 className={SECTION}>Documents</h3>
            <div className="flex flex-wrap gap-6">
              {sbc && (
                <a href={sbc} target="_blank" rel="noopener noreferrer" className={LINK}>
                  <FileText className="h-4 w-4" />
                  Summary of Benefits and Coverage
                </a>
              )}
              {plan.formularyUrl && (
                <a
                  href={plan.formularyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK}
                >
                  <FileText className="h-4 w-4" />
                  Prescription List
                </a>
              )}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h3 className={SECTION}>Care Services</h3>
          <BenefitTable benefits={plan.benefits} rows={CARE_SERVICES} />
        </section>

        {drugs.length > 0 && (
          <section className="space-y-3">
            <h3 className={SECTION}>Your Prescriptions</h3>
            <ul className="divide-y divide-brown-gravie-20">
              {drugs.map((drug) => {
                const cover = plan.coverage.drugs.find((d) => d.ndc === drug.ndc)
                return (
                  <li key={drug.medId} className="flex items-start justify-between gap-4 py-3">
                    <span className="text-paragraph-regular text-ink-50">{drug.name}</span>
                    <span className="shrink-0 text-right">
                      {cover?.covered ? (
                        <span className="inline-flex items-center gap-1 text-paragraph-small font-bold text-secondary-green-70">
                          <Check className="h-4 w-4" />
                          Covered
                        </span>
                      ) : (
                        <span className="text-paragraph-small text-brown-gravie-50">
                          Not covered
                        </span>
                      )}
                      <span className="block text-paragraph-extra-small text-brown-gravie-50">
                        {formatTier(cover?.tier ?? null)}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          <h3 className={SECTION}>Prescription Coverage</h3>
          <BenefitTable benefits={plan.benefits} rows={PRESCRIPTION_COVERAGE} />
        </section>

        <section className="space-y-3">
          <h3 className={SECTION}>Additional Coverages</h3>
          <BenefitTable benefits={plan.benefits} rows={ADDITIONAL_COVERAGES} />
        </section>

        <section className="space-y-1 border-t border-brown-gravie-20 pt-4">
          <h3 className={SECTION}>Cost sharing</h3>
          <p className="tnum text-paragraph-small text-brown-gravie-50">
            Deductible {formatCents(plan.deductibleIndividualCents)} / person ·{' '}
            {formatCents(plan.deductibleFamilyCents)} / household
          </p>
          <p className="tnum text-paragraph-small text-brown-gravie-50">
            Max OOP {formatCents(plan.outOfPocketMaxIndividualCents)} / person ·{' '}
            {formatCents(plan.outOfPocketMaxFamilyCents)} / household
          </p>
        </section>

        <div className="flex justify-end">
          <button type="button" onClick={onClose} className={BTN_OUTLINE}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  )
}
