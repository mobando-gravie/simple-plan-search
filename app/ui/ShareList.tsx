import { TEXT } from './colors'
import { cx } from './cx'
import { BAR_FILL, BAR_TRACK, DIVIDED_LIST } from './theme'

export type ShareRow = {
  key: string
  label: React.ReactNode
  /** A second line under the label — the issuer under a plan name. */
  detail?: React.ReactNode
  /** Already formatted; the list never does arithmetic on it. */
  value: string
  /** 0–100. Renders the bar and the percentage; omit for a plain ranked list. */
  pct?: number
}

/**
 * Name on the left, number on the right, an optional share bar underneath. The label
 * side is the one that shrinks and wraps; the value never does, so columns stay aligned.
 */
export function ShareList({
  rows,
  ranked = false,
  className,
}: {
  rows: ShareRow[]
  ranked?: boolean
  className?: string
}) {
  const Tag = ranked ? 'ol' : 'ul'
  return (
    <Tag className={cx(DIVIDED_LIST, className)}>
      {rows.map((row, i) => (
        <li key={row.key} className="py-2.5 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-4 text-paragraph-small">
            <span className={cx('flex min-w-0 gap-2', TEXT.body)}>
              {ranked && (
                <span className={cx('tnum w-5 shrink-0 text-right', TEXT.faint)}>{i + 1}</span>
              )}
              <span className="min-w-0">
                <span className="block">{row.label}</span>
                {row.detail && (
                  <span className={cx('block text-paragraph-extra-small', TEXT.muted)}>
                    {row.detail}
                  </span>
                )}
              </span>
            </span>
            <span className="tnum shrink-0 whitespace-nowrap text-right">
              <span className={cx('font-bold', TEXT.heading)}>{row.value}</span>
              {row.pct !== undefined && (
                <span className={cx('ml-2 inline-block w-9', TEXT.muted)}>{row.pct}%</span>
              )}
            </span>
          </div>
          {row.pct !== undefined && (
            <div className={cx('mt-1.5', BAR_TRACK, ranked && 'ml-7')} aria-hidden>
              <div className={BAR_FILL} style={{ width: `${Math.min(100, row.pct)}%` }} />
            </div>
          )}
        </li>
      ))}
    </Tag>
  )
}
