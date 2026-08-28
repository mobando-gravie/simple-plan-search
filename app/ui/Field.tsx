'use client'
import { useId } from 'react'
import { TEXT } from './colors'
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
