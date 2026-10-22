import { CircleAlert, LoaderCircle } from 'lucide-react'
import { BORDER, TEXT } from './colors'
import { cx } from './cx'
import { MUTED, MUTED_XS, PANEL } from './theme'

const SIZES = { sm: MUTED, xs: MUTED_XS } as const

/** The muted caption, by far the most repeated text treatment in the app. */
export function Muted({
  size = 'sm',
  as: Tag = 'p',
  className,
  children,
}: {
  size?: keyof typeof SIZES
  as?: 'p' | 'span' | 'div'
  className?: string
  children: React.ReactNode
}) {
  return <Tag className={cx(SIZES[size], className)}>{children}</Tag>
}

/** What a list renders instead of itself when it has nothing to show. */
export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className={MUTED}>{children}</p>
}

/**
 * A page-level blank slate: what to do here, and optionally a few things to try.
 * Dashed rather than elevated, so it reads as a placeholder and not a result.
 */
export function EmptyPanel({
  icon,
  title,
  children,
  actions,
}: {
  icon?: React.ReactNode
  title: string
  children?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-sm border border-dashed px-4 py-10 text-center sm:py-14',
        BORDER.subtle,
      )}
    >
      {icon && <span className={cx('mb-3 [&_svg]:size-8', TEXT.faint)}>{icon}</span>}
      <p className={cx('text-paragraph-regular font-bold', TEXT.heading)}>{title}</p>
      {children && <div className={cx('mt-1 max-w-md', MUTED)}>{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}

/** Announced to screen readers; the spinner alone says nothing. */
export function LoadingState({ children = 'Loading…' }: { children?: React.ReactNode }) {
  return (
    <p role="status" className={cx('flex items-center gap-2', MUTED)}>
      <LoaderCircle className={cx('size-4 animate-spin', TEXT.accent)} />
      {children}
    </p>
  )
}

/** A lookup that came back with an error body — the message, and the API's hint under it. */
export function ErrorState({ message, hint }: { message: string; hint?: string | null }) {
  return (
    <div role="alert" className={cx(PANEL, 'flex gap-3')}>
      <CircleAlert className={cx('mt-0.5 size-5 shrink-0', TEXT.danger)} />
      <div className="min-w-0">
        <p className={cx('text-paragraph-regular font-bold', TEXT.heading)}>{message}</p>
        {hint && <Muted className="mt-1">{hint}</Muted>}
      </div>
    </div>
  )
}
