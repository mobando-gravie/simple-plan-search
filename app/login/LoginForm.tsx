'use client'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { Button } from '@/app/ui/Button'
import { TEXT } from '@/app/ui/colors'
import { CARD, FIELD, H1 } from '@/app/ui/theme'

export default function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="flex justify-center py-16">
      <div className={`${CARD} w-full max-w-sm p-8`}>
        <h1 className={`mb-6 ${H1}`}>Password required</h1>
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
            <p className={`text-paragraph-small ${TEXT.danger}`}>{state.error}</p>
          )}
          <Button
            type="submit"
            pending={pending}
            pendingLabel="Verifying…"
            className="h-12 w-full px-6 text-base"
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  )
}
