'use client'
import { Plus, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessage } from '@/app/lib/errors'
import { MIN_SEARCH_TERM } from '@/app/lib/validation'
import { RemovableChip } from '@/app/ui/Chip'
import { TEXT } from '@/app/ui/colors'
import { Field } from '@/app/ui/Field'
import { CARD, DIVIDED_LIST, FAINT_XS, HOVER_ROW } from '@/app/ui/theme'

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

  const url = term.trim().length >= MIN_SEARCH_TERM ? buildUrl(term.trim()) : null

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
          setLoaded({ url, hits: [], error: errorMessage(e, 'search failed') })
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
      <Field
        label={label}
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        icon={<Search />}
      />

      {disabledReason && term.trim().length >= MIN_SEARCH_TERM && !url && (
        <p className={FAINT_XS}>{disabledReason}</p>
      )}
      {error && <p className={`text-paragraph-extra-small ${TEXT.danger}`}>{error}</p>}
      {pending && <p className={FAINT_XS}>Searching…</p>}

      {hits.length > 0 && (
        <ul className={`max-h-56 overflow-y-auto ${DIVIDED_LIST} ${CARD}`}>
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
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-paragraph-small transition-colors disabled:opacity-40 ${HOVER_ROW}`}
                >
                  <Plus className={`h-3.5 w-3.5 shrink-0 ${TEXT.accent}`} />
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
            <li key={item.key}>
              <RemovableChip label={item.label} onRemove={() => onRemove(item.key)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
