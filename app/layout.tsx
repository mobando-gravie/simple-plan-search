import type { Metadata } from 'next'
import { Nunito_Sans } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

// No `weight` option: Nunito Sans is variable across 200–1000, and keeping the
// axis is what makes the 900 headings real rather than synthesized.
const nunito = Nunito_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-nunito' })

export const metadata: Metadata = {
  title: 'Simple Plan Search',
  description: 'Cached Ideon plan search with Gravie premium modifiers',
}

const CONTAINER = 'mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The font variable belongs on <html>: --font-sans is emitted into :root, so a
    // --font-nunito scoped to <body> would leave it unresolved and fall back silently.
    <html lang="en" className={nunito.variable}>
      <body className="min-h-screen">
        {/* No bottom border — white on the warm ground separates on its own. */}
        <header className="w-full bg-white">
          <div className={`${CONTAINER} flex min-h-16 items-center py-3 sm:py-0`}>
            <Link
              href="/"
              className="whitespace-nowrap text-header-h4 text-brand-60 sm:text-header-h3"
            >
              Simple Plan Search
            </Link>
          </div>
        </header>
        <main className={`${CONTAINER} py-8`}>{children}</main>
      </body>
    </html>
  )
}
