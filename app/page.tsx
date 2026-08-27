import SearchForm from './SearchForm'

export default function Page() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan search</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ideon individual-market plans, cached for 24 hours, priced with the active Gravie
          modifier batch.
        </p>
      </div>
      <SearchForm />
    </div>
  )
}
