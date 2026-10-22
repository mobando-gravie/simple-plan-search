import { DATA } from '@/app/lib/services/ratingAreas'
import { PageHeader } from '@/app/ui/PageHeader'
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
      <PageHeader title="Rating areas">
        Which counties make up a geographic rating area, and the reverse — a ZIP or county to its
        area. {DATA.source}, plan year {DATA.planYear}. Export any result as CSV.
      </PageHeader>
      <RatingAreaExplorer initial={initial} />
    </div>
  )
}
