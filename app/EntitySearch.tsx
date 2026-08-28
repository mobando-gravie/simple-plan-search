'use client'
import { ClipboardList, Plus, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { errorMessage } from '@/app/lib/errors'
import { looksLikeMedIds, parseIdentifiers } from '@/app/lib/identifiers'
import { MIN_SEARCH_TERM } from '@/app/lib/validation'
import { Button } from '@/app/ui/Button'
import { RemovableChip, ToggleChip } from '@/app/ui/Chip'
import { TEXT } from '@/app/ui/colors'
import { Field } from '@/app/ui/Field'
import { useAsyncAction } from '@/app/ui/useAsyncAction'
import { BANNER_WARN, CARD, DIVIDED_LIST, FAINT_XS, FIELD, HOVER_ROW, LABEL_TEXT, MUTED_XS } from '@/app/ui/theme'

/**
 * One typeahead, used for both providers and prescriptions. mk03 ships these as
 * two near-identical 200-line components; the only real differences are the
 * endpoint, the row renderer and the placeholder, so they are parameters here.
 */
export type EntitySearchProps<T, S> = {
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
  /** Rendered on the chip row, which only exists when something is selected. */
  onClearAll: () => void
  /** 'provider' resolves NPIs, 'drug' resolves RxCUIs. */
  identifierKind: 'provider' | 'drug'
  identifierHint: string
  /** Hands back everything the paste resolved, including the ones that did not. */
  onPaste: (resolved: S[]) => void
}

const DEBOUNCE_MS = 300

export default function EntitySearch<T, S>({
  label,
  placeholder,
  buildUrl,
  disabledReason,
  keyOf,
  renderHit,
  selected,
  onAdd,
  onRemove,
  onClearAll,
  identifierKind,
  identifierHint,
  onPaste,
}: EntitySearchProps<T, S>) {
  const [byIdentifier, setByIdentifier] = useState(false)
  const [pasted, setPasted] = useState('')
  // Carries the ids it was asked about: the textarea is cleared on success, so the
  // med-id hint would have nothing left to test against.
  const [outcome, setOutcome] = useState<{
    asked: string[]
    unresolved: string[]
  } | null>(null)
  const resolving = useAsyncAction()
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

  const ids = parseIdentifiers(pasted)

  function resolve() {
    if (ids.length === 0) return
    setOutcome(null)
    resolving.run(async () => {
      const response = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: identifierKind, ids }),
      })
      const body = await response.json()
      onPaste(body.resolved ?? [])
      setOutcome({ asked: ids, unresolved: body.unresolved ?? [] })
      setPasted('')
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={LABEL_TEXT}>{label}</span>
        <span className="ml-auto flex gap-1.5">
          <ToggleChip on={!byIdentifier} onClick={() => setByIdentifier(false)}>
            <Search className="h-3 w-3" />
            Search
          </ToggleChip>
          <ToggleChip on={byIdentifier} onClick={() => setByIdentifier(true)}>
            <ClipboardList className="h-3 w-3" />
            Identifiers
          </ToggleChip>
        </span>
      </div>
      {byIdentifier ? (
        <div className="space-y-2">
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onPaste={(e) => {
              // Resolve straight off the paste rather than waiting for a blur — the
              // clipboard text is here now, and React has not applied it yet.
              const text = e.clipboardData.getData('text')
              if (text.trim()) {
                e.preventDefault()
                setPasted(text)
              }
            }}
            rows={2}
            placeholder={identifierHint}
            className={`${FIELD} h-auto py-2 font-mono text-[13px]`}
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={resolve}
              disabled={ids.length === 0}
              pending={resolving.pending}
              pendingLabel={`Resolving ${ids.length}…`}
            >
              Resolve {ids.length > 0 ? ids.length : ''}
            </Button>
            {outcome && (
              <span className={MUTED_XS}>
                resolved {outcome.asked.length - outcome.unresolved.length} of{' '}
                {outcome.asked.length}
              </span>
            )}
          </div>
          {outcome && outcome.unresolved.length > 0 && (
            <div className={BANNER_WARN}>
              <p className="text-paragraph-small font-bold">
                {outcome.unresolved.length} did not resolve — counted as not covered
              </p>
              <p className={`mt-1 break-all font-mono ${MUTED_XS}`}>
                {outcome.unresolved.join(', ')}
              </p>
              {identifierKind === 'drug' && looksLikeMedIds(outcome.asked, outcome.unresolved) && (
                <p className="mt-2 text-paragraph-small">
                  These look like Med IDs. Ideon only resolves drugs by RxCUI — paste the
                  <strong> Rx RxCUI IDs</strong> column instead.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <Field
          label=""
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          icon={<Search />}
        />
      )}

      {!byIdentifier && disabledReason && term.trim().length >= MIN_SEARCH_TERM && !url && (
        <p className={FAINT_XS}>{disabledReason}</p>
      )}
      {error && <p className={`text-paragraph-extra-small ${TEXT.danger}`}>{error}</p>}
      {pending && <p className={FAINT_XS}>Searching…</p>}

      {!byIdentifier && hits.length > 0 && (
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
        <div className="flex items-start gap-2">
          <ul className="flex flex-1 flex-wrap gap-2">
            {selected.map((item) => (
              <li key={item.key}>
                <RemovableChip label={item.label} onRemove={() => onRemove(item.key)} />
              </li>
            ))}
          </ul>
          <Button type="button" variant="text" onClick={onClearAll} className="shrink-0">
            <X />
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
