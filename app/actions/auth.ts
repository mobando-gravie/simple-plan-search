'use server'
import { redirect } from 'next/navigation'
import { createSession, deleteSession } from '@/app/lib/session'
import { matchPassword } from '@/app/lib/passwords'

export type LoginState = { error?: string } | undefined

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const submitted = formData.get('password')
  if (typeof submitted !== 'string' || !matchPassword(submitted)) {
    return { error: 'Incorrect password.' }
  }

  await createSession()
  const from = formData.get('from')
  const destination =
    typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/'
  redirect(destination)
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}
