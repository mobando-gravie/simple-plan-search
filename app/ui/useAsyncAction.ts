'use client'
import { useTransition } from 'react'

export type AsyncAction = {
  /** True from the click until the work — including any server render — has landed. */
  pending: boolean
  run: (action: () => void | Promise<void>) => void
}

/**
 * A slow action and the flag that says it is running. One instance per action —
 * the flag drives which button spins, so sharing one lights up the wrong button.
 */
export function useAsyncAction(): AsyncAction {
  const [pending, startTransition] = useTransition()
  return {
    pending,
    run: (action) => startTransition(async () => { await action() }),
  }
}
