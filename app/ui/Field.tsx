'use client'
import { Check, Minus } from 'lucide-react'
import { useId } from 'react'
import type { CoverageFilter } from '@/app/lib/planFilter'
import { BG, BORDER, TEXT } from './colors'
import { cx } from './cx'
import { CHECKBOX, FIELD, fieldClass, HINT, LABEL } from './theme'

type FieldProps = {
  label: string
  hint?: string
  /** Tailwind width class; the age inputs are w-24, everything else fills its cell. */
  width?: string
  /** Renders inside the input on the left, as the typeahead's magnifier does. */
  icon?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>

export function Field({ label, hint, width, icon, className, ...input }: FieldProps) {
  const inputId = useId()
  const control = (
    <input
      id={inputId}
      {...input}
      className={cx(width ? fieldClass(width) : FIELD, icon ? 'pl-9' : null, className)}
    />
  )
  return (
    <label htmlFor={inputId} className="block">
      <span className={LABEL}>{label}</span>
      {icon ? (
        <div className="relative">
          <span
            className={cx(
              'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 [&_svg]:size-4',
              TEXT.faint,
            )}
          >
            {icon}
          </span>
          {control}
        </div>
      ) : (
        control
      )}
      {hint && <span className={HINT}>{hint}</span>}
    </label>
  )
}

export function Select({
  label,
  hint,
  className,
  children,
  ...select
}: { label: string; hint?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const selectId = useId()
  return (
    <label htmlFor={selectId} className="block">
      <span className={LABEL}>{label}</span>
      <select id={selectId} {...select} className={cx(FIELD, className)}>
        {children}
      </select>
      {hint && <span className={HINT}>{hint}</span>}
    </label>
  )
}

/** Checkbox and its text on one line — the label wraps the input, so no htmlFor. */
const CYCLE = [null, 'partial', 'match'] as const
const ARIA_CHECKED = { partial: 'mixed', match: true } as const

/**
 * A checkbox with a third state: off, at least one, all. Hand-drawn rather than a
 * native input because `indeterminate` is a DOM property with no attribute, so the
 * middle state cannot be expressed declaratively — hence role + aria-checked="mixed".
 */
export function TriStateCheckbox({
  value,
  onChange,
  label,
}: {
  value: CoverageFilter
  onChange: (next: CoverageFilter) => void
  label: string
}) {
  const on = value !== null
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={value === null ? false : ARIA_CHECKED[value]}
      onClick={() => onChange(CYCLE[(CYCLE.indexOf(value) + 1) % CYCLE.length])}
      className={cx(
        'flex items-center gap-2 whitespace-nowrap text-paragraph-small',
        TEXT.body,
      )}
    >
      <span
        className={cx(
          'inline-flex h-4 w-4 items-center justify-center rounded-xs border transition-colors',
          '[&_svg]:size-3',
          on ? `${BORDER.accent} ${BG.accent} ${TEXT.onAccent}` : `${BORDER.input} ${BG.surface}`,
        )}
      >
        {value === 'match' && <Check />}
        {value === 'partial' && <Minus />}
      </span>
      {label}
    </button>
  )
}

export function CheckboxRow({
  label,
  className,
  ...input
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cx(
        'flex items-center gap-2 whitespace-nowrap text-paragraph-small',
        TEXT.body,
        className,
      )}
    >
      <input type="checkbox" {...input} className={CHECKBOX} />
      {label}
    </label>
  )
}
