import { ENROLLMENT_DATA } from '@/app/lib/services/enrollment'
import { H1, PAGE_SUBTITLE } from '@/app/ui/theme'
import EnrollmentExplorer from './EnrollmentExplorer'

export default async function EnrollmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const state = typeof sp.state === 'string' ? sp.state : undefined
  const yearRaw = typeof sp.year === 'string' ? Number(sp.year) : NaN
  const year = Number.isInteger(yearRaw) ? yearRaw : undefined

  return (
    <div className="space-y-8">
      <div>
        <h1 className={H1}>Enrollment</h1>
        <p className={PAGE_SUBTITLE}>
          Marketplace enrollment by state: the metal mix and the plans and issuers people actually
          chose. {ENROLLMENT_DATA.source}, average monthly, {ENROLLMENT_DATA.planYears[0]}–
          {ENROLLMENT_DATA.planYears.at(-1)}. Export any state as CSV.
        </p>
      </div>
      <EnrollmentExplorer initialState={state} initialYear={year} />
    </div>
  )
}
