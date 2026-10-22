import { COUNTY_DATA } from '@/app/lib/services/countyEnrollment'
import { H1, PAGE_SUBTITLE } from '@/app/ui/theme'
import CountyExplorer from './CountyExplorer'

export default async function CountyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const fips = typeof sp.fips === 'string' ? sp.fips : undefined
  const zip = typeof sp.zip === 'string' ? sp.zip : undefined

  return (
    <div className="space-y-8">
      <div>
        <h1 className={H1}>County landscape</h1>
        <p className={PAGE_SUBTITLE}>
          Who insures a county and who is enrolled — issuers and enrollee demographics from the CMS
          detailed PUF, plan year {COUNTY_DATA.planYear}. HealthCare.gov states only. Look up by ZIP
          or county FIPS.
        </p>
      </div>
      <CountyExplorer initialFips={fips} initialZip={zip} />
    </div>
  )
}
