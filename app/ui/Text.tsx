import { cx } from './cx'
import { MUTED, MUTED_XS } from './theme'

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
