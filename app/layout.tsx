import type { Metadata } from 'next'
import Link from 'next/link'
import { logout } from './actions/auth'
import './globals.css'

export const metadata: Metadata = {
  title: 'Simple Plan Search',
  description: 'Cached Ideon plan search with Gravie premium modifiers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Simple Plan Search
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
              <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Search
              </Link>
              <Link href="/modifiers" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Modifiers
              </Link>
            </nav>
            <form action={logout} className="ml-auto">
              <button
                type="submit"
                className="text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
