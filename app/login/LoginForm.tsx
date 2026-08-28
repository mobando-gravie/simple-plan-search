'use client'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { BTN_SOLID, CARD, FIELD } from '@/app/ui/theme'

export default function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="flex justify-center py-16">
      <div className={`${CARD} w-full max-w-sm p-8`}>
        <h1 className="mb-6 text-header-h2">Password required</h1>
        <form action={action} className="flex flex-col gap-4">
          {from && <input type="hidden" name="from" value={from} />}
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            autoFocus
            required
            className={FIELD}
          />
          {state?.error && (
            <p className="text-paragraph-small text-destructive">{state.error}</p>
          )}
          <button type="submit" disabled={pending} className={`${BTN_SOLID} h-12 w-full px-6 text-base`}>
            {pending ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
