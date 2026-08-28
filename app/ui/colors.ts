/**
 * Color roles as Tailwind class fragments. The hex values stay in globals.css @theme —
 * this names what each ramp step is for, so picking a border shade stops being a guess.
 */

// Every value is a complete literal: Tailwind v4 scans source as plain text, so a
// composed `text-${tone}-50` would name a class it never generates.

export const TEXT = {
  heading: 'text-ink-60',
  body: 'text-ink-50',
  muted: 'text-brown-gravie-50',
  faint: 'text-brown-gravie-30',
  accent: 'text-brand-60',
  accentStrong: 'text-brand-70',
  /** The label on a filled CTA — the brand tint, not white. */
  onAccent: 'text-brand-10',
  onInverse: 'text-ink-15',
  positive: 'text-success-70',
  danger: 'text-destructive',
} as const

export const BG = {
  page: 'bg-brown-gravie-5',
  surface: 'bg-white',
  sunken: 'bg-brown-gravie-10',
  neutral: 'bg-ink-10',
  inverse: 'bg-ink-60',
  accent: 'bg-brand-60',
  accentStrong: 'bg-brand-70',
  accentSoft: 'bg-brand-20',
  accentHover: 'bg-brand-10',
  positive: 'bg-success-10',
  danger: 'bg-destructive/5',
} as const

export const BORDER = {
  subtle: 'border-brown-gravie-20',
  neutral: 'border-ink-15',
  input: 'border-ink-30',
  accent: 'border-brand-50',
  accentSoft: 'border-brand-30',
  positive: 'border-success-60',
  positiveSoft: 'border-success-60/30',
  danger: 'border-destructive/40',
  dangerSoft: 'border-destructive/30',
} as const

/**
 * Prefixed variants are spelled out in full rather than composed as `hover:${BG.x}` —
 * the scanner reads source text, so an interpolated prefix names a class it never emits.
 */
export const HOVER = {
  accent: 'hover:text-brand-70',
  accentSurface: 'hover:bg-brand-10',
  accentStrongSurface: 'hover:bg-brand-70',
  danger: 'hover:text-destructive',
  muted: 'hover:text-brown-gravie-50',
} as const

export const PLACEHOLDER = { faint: 'placeholder:text-brown-gravie-30' } as const

export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-50'

/** Hairline between rows in a divided list or table body. */
export const DIVIDE = 'divide-brown-gravie-20'
