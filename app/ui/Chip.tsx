import { Check, Minus, X } from 'lucide-react'
import type { CoverageMatch } from '@/app/lib/ideon/coverage'
import { isMetalLevel } from '@/app/lib/metal'
import type { CoverageFilter } from '@/app/lib/planFilter'
import { BG, BORDER, HOVER, TEXT } from './colors'
import { cx } from './cx'
import { CHIP } from './theme'

export type ChipTone = 'neutral' | 'orange' | 'green' | 'brown' | 'destructive'

export const CHIP_TONES: Record<ChipTone, string> = {
  neutral: `${BORDER.neutral} ${BG.neutral} ${TEXT.body}`,
  orange: `${BORDER.accentSoft} ${BG.accentSoft} ${TEXT.accentStrong}`,
  green: `${BORDER.positive} ${BG.positive} ${TEXT.positive}`,
  brown: `${BORDER.subtle} ${BG.sunken} ${TEXT.muted}`,
  destructive: `${BORDER.dangerSoft} ${BG.danger} ${TEXT.danger}`,
}

/** match / partial / none, as member-client's coverage-match-class. */
export const TONE_BY_MATCH: Record<CoverageMatch, ChipTone> = {
  match: 'green',
  partial: 'orange',
  none: 'brown',
}

/** Ideon can add a metal level we have never seen; it falls back to neutral. */
export function metalTone(metal: string | null): ChipTone {
  if (metal === null || !isMetalLevel(metal)) return 'neutral'
  if (metal === 'bronze' || metal === 'expanded_bronze') return 'orange'
  if (metal === 'silver') return 'neutral'
  if (metal === 'gold') return 'brown'
  if (metal === 'platinum') return 'green'
  return 'destructive'
}

export function Chip({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: ChipTone
  className?: string
  children: React.ReactNode
}) {
  return <span className={cx(CHIP, CHIP_TONES[tone], className)}>{children}</span>
}

/** Multi-select as toggle chips — a native multiple-select is unusable on touch. */
const TOGGLE_OFF = `${BORDER.subtle} ${BG.surface} ${TEXT.muted} ${HOVER.accentSurface}`

export function ToggleChip({
  on,
  onClick,
  className,
  children,
}: {
  on: boolean
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(CHIP, 'transition-colors', on ? CHIP_TONES.orange : TOGGLE_OFF, className)}
    >
      {children}
    </button>
  )
}

const CYCLE = [null, 'partial', 'match'] as const
const ARIA_CHECKED = { partial: 'mixed', match: true } as const

/**
 * Off → at least one → all, and back. A native checkbox cannot express the middle
 * state declaratively (indeterminate is a DOM property, not an attribute), so this
 * is a button carrying the standard aria-checked="mixed" contract instead.
 */
export function TriStateChip({
  value,
  onChange,
  children,
}: {
  value: CoverageFilter
  onChange: (next: CoverageFilter) => void
  children: React.ReactNode
}) {
  const on = value !== null
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={value === null ? false : ARIA_CHECKED[value]}
      onClick={() => onChange(CYCLE[(CYCLE.indexOf(value) + 1) % CYCLE.length])}
      className={cx(
        CHIP,
        'transition-colors [&_svg]:size-3',
        on ? CHIP_TONES.orange : TOGGLE_OFF,
      )}
    >
      {/* Tone already says active, as it does on the plain toggles; the glyph only
          has to separate "some of them" from "all of them". */}
      {value === 'match' && <Check />}
      {value === 'partial' && <Minus />}
      {children}
    </button>
  )
}

/** A selection the user can take back — the typeahead's chosen providers and drugs. */
export function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className={cx(CHIP, CHIP_TONES.orange, 'font-normal')}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className={cx('transition-colors', HOVER.danger, '[&_svg]:size-3')}
      >
        <X />
      </button>
    </span>
  )
}
