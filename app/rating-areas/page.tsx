import { DATA } from '@/app/lib/services/ratingAreas'
import { H1, PAGE_SUBTITLE } from '@/app/ui/theme'
import { parseLookup } from './lookupParams'
import RatingAreaExplorer from './RatingAreaExplorer'

export default async function RatingAreasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const initial = parseLookup(await searchParams)
  return (
    <div className="space-y-8">
      <div>
        <h1 className={H1}>Rating areas</h1>
        <p className={PAGE_SUBTITLE}>
          Which counties make up a geographic rating area, and the reverse — a ZIP or county to its
          area. {DATA.source}, plan year {DATA.planYear}. Export any result as CSV.
        </p>
      </div>
      <RatingAreaExplorer initial={initial} />
    </div>
  )
}
