'use client'
import { Plus, Search, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { FIELD, LABEL } from '@/app/ui/theme'

/**
 * One typeahead, used for both providers and prescriptions. mk03 ships these as
 * two near-identical 200-line components; the only real differences are the
 * endpoint, the row renderer and the placeholder, so they are parameters here.
 */
export type EntitySearchProps<T> = {
  label: string
  placeholder: string
  /** null suppresses searching — e.g. providers need a ZIP first. */
  buildUrl: (term: string) => string | null
  disabledReason?: string
  keyOf: (hit: T) => string
  renderHit: (hit: T) => React.ReactNode
  selected: { key: string; label: string }[]
  onAdd: (hit: T) => void
  onRemove: (key: string) => void
}

const MIN_TERM = 3
const DEBOUNCE_MS = 300

export default function EntitySearch<T>({
  label,
  placeholder,
  buildUrl,
  disabledReason,
  keyOf,
  renderHit,
  selected,
  onAdd,
  onRemove,
}: EntitySearchProps<T>) {
  const [term, setTerm] = useState('')
  const [loaded, setLoaded] = useState<{ url: string; hits: T[]; error: string | null } | null>(
    null,
  )
  const inputId = useId()

  const url = term.trim().length >= MIN_TERM ? buildUrl(term.trim()) : null

  // Everything but `loaded` is derived, and `loaded` is only written from the
  // async callback — keyed by url, so a slow early keystroke cannot overwrite a
  // later result and no state is set synchronously during the effect.
  const fresh = url !== null && loaded?.url === url
  const hits = fresh ? loaded.hits : []
  const error = fresh ? loaded.error : null
  const pending = url !== null && !fresh

  useEffect(() => {
    if (!url) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(url, { signal: controller.signal })
        const body = await response.json()
        setLoaded({ url, hits: body.hits ?? [], error: body.error ?? null })
      } catch (e) {
        if (!controller.signal.aborted) {
          setLoaded({ url, hits: [], error: e instanceof Error ? e.message : 'search failed' })
        }
      }
    }, DEBOUNCE_MS)
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [url])

  const selectedKeys = new Set(selected.map((s) => s.key))

  return (
    <div className="space-y-3">
      <label htmlFor={inputId} className="block">
        <span className={LABEL}>{label}</span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-gravie-30" />
          <input
            id={inputId}
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            className={`${FIELD} pl-9`}
          />
        </div>
      </label>

      {disabledReason && term.trim().length >= MIN_TERM && !url && (
        <p className="text-paragraph-extra-small text-brown-gravie-30">{disabledReason}</p>
      )}
      {error && <p className="text-paragraph-extra-small text-destructive">{error}</p>}
      {pending && <p className="text-paragraph-extra-small text-brown-gravie-30">Searching…</p>}

      {hits.length > 0 && (
        <ul className="max-h-56 divide-y divide-brown-gravie-20 overflow-y-auto rounded-sm bg-white shadow-elevation-1">
          {hits.map((hit) => {
            const key = keyOf(hit)
            const already = selectedKeys.has(key)
            return (
              <li key={key}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => {
                    onAdd(hit)
                    setTerm('')
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-paragraph-small transition-colors hover:bg-marketplace-orange-10 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-marketplace-orange-60" />
                  <span className="min-w-0">{renderHit(hit)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <li
              key={item.key}
              className="inline-flex items-center gap-1.5 rounded-xs border border-marketplace-orange-30 bg-marketplace-orange-20 px-2 py-1 text-paragraph-extra-small text-marketplace-orange-70"
            >
              {item.label}
              <button
                type="button"
                onClick={() => onRemove(item.key)}
                aria-label="Remove"
                className="text-marketplace-orange-70 transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
