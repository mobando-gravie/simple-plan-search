import { FileText } from 'lucide-react'
import { HOVER, TEXT } from './colors'
import { cx } from './cx'

const SIZES = {
  sm: 'gap-1.5 text-paragraph-small [&_svg]:size-3.5',
  regular: 'gap-2 text-paragraph-regular [&_svg]:size-4',
} as const

/** A carrier PDF: always a new tab, always the document glyph. */
export function DocLink({
  href,
  size = 'regular',
  children,
}: {
  href: string
  size?: keyof typeof SIZES
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx('inline-flex items-center underline', SIZES[size], TEXT.accent, HOVER.accent)}
    >
      <FileText />
      {children}
    </a>
  )
}
