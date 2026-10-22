import { DIVIDE, TEXT } from './colors'
import { cx } from './cx'
import { Muted } from './Text'
import { EYEBROW } from './theme'

/** `md` is for a name rather than a number: a size down, and it wraps instead of clipping. */
const SIZES = {
  lg: `tnum text-header-h3 sm:text-header-h2 ${TEXT.heading} truncate`,
  md: `text-header-h4 ${TEXT.heading} break-words`,
} as const

/** One headline number with its label; several in a row make a summary strip. */
export function Figure({
  label,
  value,
  detail,
  size = 'lg',
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  detail?: React.ReactNode
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <div className={cx('min-w-0', className)}>
      <div className={EYEBROW}>{label}</div>
      <div className={cx(SIZES[size], 'mt-1')}>{value}</div>
      {detail && (
        <Muted size="xs" className="mt-0.5 break-words">
          {detail}
        </Muted>
      )}
    </div>
  )
}

/** Figures side by side, ruled between them once there is room for a row. */
export function FigureStrip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cx(
        'grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-0 sm:divide-x',
        DIVIDE,
        'sm:[&>*]:px-6 sm:[&>*:first-child]:pl-0 sm:[&>*:last-child]:pr-0',
      )}
    >
      {children}
    </div>
  )
}
