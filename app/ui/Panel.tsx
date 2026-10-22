import { BORDER } from './colors'
import { cx } from './cx'
import { Muted } from './Text'
import { CARD, PANEL_PAD, PANEL_TITLE } from './theme'

/**
 * A titled card. `flush` drops the body padding so a table or divided list runs
 * edge to edge under the head; `actions` sit on the title row and wrap under it on phones.
 */
export function Panel({
  title,
  subtitle,
  actions,
  as: Tag = 'h2',
  flush = false,
  className,
  children,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  as?: 'h2' | 'h3'
  flush?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cx(CARD, 'overflow-hidden', className)}>
      <div
        className={cx(
          'flex flex-wrap items-start justify-between gap-x-6 gap-y-3 py-4 sm:py-5',
          PANEL_PAD,
          flush && `border-b ${BORDER.subtle}`,
        )}
      >
        <div className="min-w-0 flex-1 basis-56">
          <Tag className={PANEL_TITLE}>{title}</Tag>
          {subtitle && <Muted className="mt-1">{subtitle}</Muted>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className={cx(flush ? undefined : `${PANEL_PAD} pb-4 sm:pb-6`)}>{children}</div>
    </section>
  )
}
