'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FOCUS_RING, TEXT } from '@/app/ui/colors'
import { cx } from '@/app/ui/cx'

const LINKS = [
  { href: '/', label: 'Plans' },
  { href: '/rating-areas', label: 'Rating areas' },
  { href: '/enrollment', label: 'Enrollment' },
] as const

const LINK =
  'inline-flex min-h-9 items-center rounded-xs px-2 text-paragraph-small transition-colors ' +
  `hover:text-brand-60 ${FOCUS_RING}`

/** Client-side only for the active state; the links themselves are plain anchors. */
export default function NavLinks() {
  const pathname = usePathname()
  return (
    <nav aria-label="Primary" className="-mx-2 ml-auto flex flex-wrap items-center justify-end">
      {LINKS.map(({ href, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cx(LINK, active ? `font-bold ${TEXT.accent}` : TEXT.heading)}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
