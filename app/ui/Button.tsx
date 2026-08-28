import { cx } from './cx'
import { BTN_OUTLINE, BTN_SOLID, BTN_TEXT, BTN_TEXT_DESTRUCTIVE } from './theme'
import { HOVER, TEXT } from './colors'

const VARIANTS = {
  solid: BTN_SOLID,
  outline: BTN_OUTLINE,
  text: BTN_TEXT,
  textDestructive: BTN_TEXT_DESTRUCTIVE,
} as const

export type ButtonVariant = keyof typeof VARIANTS

type ButtonProps = {
  variant?: ButtonVariant
  /** Disables and swaps the label — every submit in the app does this. */
  pending?: boolean
  pendingLabel?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant = 'solid',
  pending = false,
  pendingLabel,
  className,
  disabled,
  children,
  ...button
}: ButtonProps) {
  return (
    <button
      {...button}
      disabled={disabled || pending}
      className={cx(VARIANTS[variant], className)}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  )
}

const ICON_SIZES = { sm: '[&_svg]:size-3', md: '[&_svg]:size-4', lg: '[&_svg]:size-5' } as const

/**
 * An icon on its own is not a label, so `label` is required and becomes aria-label.
 * Every one of these in the app removes something, hence the destructive hover.
 */
export function IconButton({
  label,
  size = 'md',
  className,
  children,
  ...button
}: {
  label: string
  size?: keyof typeof ICON_SIZES
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...button}
      aria-label={label}
      className={cx('rounded-xs p-1 transition-colors', TEXT.faint, HOVER.danger, ICON_SIZES[size], className)}
    >
      {children}
    </button>
  )
}
