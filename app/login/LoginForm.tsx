'use client'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { Button } from '@/app/ui/Button'
import { Field } from '@/app/ui/Field'
import { Muted } from '@/app/ui/Text'
import { BANNER_ERROR, CARD, SECTION_TITLE } from '@/app/ui/theme'

export default function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState(login, undefined)

  return (
    <div className="flex justify-center py-6 sm:py-16">
      <div className={`${CARD} w-full max-w-sm p-6 sm:p-8`}>
        <h1 className={SECTION_TITLE}>Sign in</h1>
        <Muted className="mt-1">This tool is internal. Enter the shared password to continue.</Muted>
        <form action={action} className="mt-6 flex flex-col gap-4">
          {from && <input type="hidden" name="from" value={from} />}
          <Field
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            autoFocus
            required
          />
          {state?.error && (
            <p role="alert" className={BANNER_ERROR}>
              {state.error}
            </p>
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
