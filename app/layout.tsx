import type { Metadata } from 'next'
import { Nunito_Sans } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import NavLinks from './NavLinks'
import { FOCUS_RING } from './ui/colors'
import { CONTAINER } from './ui/theme'

// No `weight` option: Nunito Sans is variable across 200–1000, and keeping the
// axis is what makes the 900 headings real rather than synthesized.
const nunito = Nunito_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-nunito' })

export const metadata: Metadata = {
  title: 'Simple Plan Search',
  description: 'Cached Ideon plan search with Gravie premium modifiers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The font variable belongs on <html>: --font-sans is emitted into :root, so a
    // --font-nunito scoped to <body> would leave it unresolved and fall back silently.
    <html lang="en" className={nunito.variable}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xs focus:bg-white focus:px-3 focus:py-2 ${FOCUS_RING}`}
        >
          Skip to content
        </a>
        {/* No bottom border — white on the warm ground separates on its own. */}
        <header className="w-full bg-white">
          <div className={`${CONTAINER} flex min-h-16 flex-wrap items-center gap-x-6 gap-y-1 py-2`}>
            <Link
              href="/"
              className={`whitespace-nowrap rounded-xs text-header-h4 text-brand-60 sm:text-header-h3 ${FOCUS_RING}`}
            >
              Simple Plan Search
            </Link>
            <NavLinks />
          </div>
        </header>
        <main id="main" className={`${CONTAINER} flex-1 py-6 sm:py-10`}>
          {children}
        </main>
      </body>
    </html>
  )
}
