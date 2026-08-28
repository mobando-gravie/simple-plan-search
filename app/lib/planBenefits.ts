import { inNetworkCostShare } from './ideon/coverage'
import type { CostShare } from './ideon/types'

/**
 * The plan-details sections, mirroring member-client's details page. Ideon returns
 * ~48 cost-share fields; these lists pick and order the ones each section shows.
 */
export type BenefitRow = { key: string; label: string }

export const CARE_SERVICES: BenefitRow[] = [
  { key: 'preventative_care', label: 'Preventive Care' },
  { key: 'primary_care_physician', label: 'Primary Care' },
  { key: 'specialist', label: 'Specialist' },
  { key: 'urgent_care', label: 'Urgent Care' },
  { key: 'emergency_room', label: 'Emergency Room' },
  { key: 'ambulance', label: 'Ambulance' },
  { key: 'diagnostic_test', label: 'Diagnostic Test' },
  { key: 'lab_test', label: 'Lab Test' },
  { key: 'imaging', label: 'Imaging' },
  { key: 'outpatient_facility', label: 'Outpatient Facility' },
  { key: 'inpatient_facility', label: 'Inpatient Facility' },
  { key: 'outpatient_mental_health', label: 'Outpatient Mental Health' },
  { key: 'inpatient_mental_health', label: 'Inpatient Mental Health' },
]

export const PRESCRIPTION_COVERAGE: BenefitRow[] = [
  { key: 'generic_drugs', label: 'Generic' },
  { key: 'preferred_brand_drugs', label: 'Preferred Brand' },
  { key: 'non_preferred_brand_drugs', label: 'Non-Preferred Brand' },
  { key: 'specialty_drugs', label: 'Specialty' },
]

export const ADDITIONAL_COVERAGES: BenefitRow[] = [
  { key: 'home_health_care', label: 'Home Health Care' },
  { key: 'rehabilitation_services', label: 'Rehabilitation Services' },
  { key: 'habilitation_services', label: 'Habilitation Services' },
  { key: 'skilled_nursing', label: 'Skilled Nursing' },
  { key: 'durable_medical_equipment', label: 'Durable Medical Equipment' },
  { key: 'hospice_service', label: 'Hospice' },
  { key: 'prenatal_postnatal_care', label: 'Prenatal / Postnatal Care' },
  { key: 'inpatient_birth', label: 'Inpatient Birth' },
  { key: 'child_eye_exam', label: 'Child Eye Exam' },
  { key: 'child_eyewear', label: 'Child Eyewear' },
  { key: 'child_dental', label: 'Child Dental' },
]

/** Every key any section can render — the mapper keeps only these. */
export const BENEFIT_KEYS: string[] = [
  ...CARE_SERVICES,
  ...PRESCRIPTION_COVERAGE,
  ...ADDITIONAL_COVERAGES,
].map((row) => row.key)

export type BenefitValue = { label: string; inNetwork: string; outOfNetwork: string }

function outOfNetworkCostShare(share: CostShare | undefined): string | null {
  if (share === null || share === undefined) return null
  if (typeof share !== 'string') return share.out_of_network
  const match = /Out-of-Network:\s*(.+)$/i.exec(share)
  return match ? match[1].trim() : null
}

const NOT_AVAILABLE = 'Not Available'

/** Rows with nothing on either side are dropped — an empty row tells the reader nothing. */
export function benefitValues(
  benefits: Record<string, CostShare>,
  rows: BenefitRow[],
): BenefitValue[] {
  return rows
    .map((row) => {
      const share = benefits[row.key]
      const inNetwork = inNetworkCostShare(share)
      const outOfNetwork = outOfNetworkCostShare(share)
      if (!inNetwork && !outOfNetwork) return null
      return {
        label: row.label,
        inNetwork: inNetwork ?? NOT_AVAILABLE,
        outOfNetwork: outOfNetwork ?? NOT_AVAILABLE,
      }
    })
    .filter((v): v is BenefitValue => v !== null)
}

/** "preferred_generic" → "Preferred Generic" for the per-drug tier line. */
export function formatTier(tier: string | null): string {
  if (!tier) return 'Not covered'
  return tier
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** The SBC if the carrier published one, else whatever document came first. */
export function sbcUrl(documents: { type: string; url: string }[]): string | null {
  return (
    documents.find((d) => d.type === 'summary_of_benefits_and_coverage')?.url ??
    documents[0]?.url ??
    null
  )
}
