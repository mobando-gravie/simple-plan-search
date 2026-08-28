import SearchForm from './SearchForm'
import { H1, PAGE_SUBTITLE } from './ui/theme'

export default function Page() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className={H1}>Plan search</h1>
        <p className={PAGE_SUBTITLE}>
          Ideon individual-market plans, cached for 24 hours, priced with the active Gravie
          modifier batch.
        </p>
      </div>
      <SearchForm />
    </div>
  )
}
