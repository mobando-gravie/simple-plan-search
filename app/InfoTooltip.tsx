'use client'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Info } from 'lucide-react'
import { useState } from 'react'

/**
 * Styled to what member-client actually renders (components/tooltip.cljs): dark
 * ink-60 bubble, ink-15 text, 4px radius, 192px wide.
 */
const CONTENT =
  'z-50 max-w-48 rounded-sm bg-ink-60 px-2 py-1 text-paragraph-small text-ink-15 shadow-elevation-1'

function Bubble({ copy }: { copy: string }) {
  return (
    <Tooltip.Portal>
      <Tooltip.Content side="top" align="start" sideOffset={6} collisionPadding={8} className={CONTENT}>
        {copy}
        <Tooltip.Arrow className="fill-ink-60" />
      </Tooltip.Content>
    </Tooltip.Portal>
  )
}

/**
 * A Radix Root per tooltip is stateful, and a 200-plan result carries ~2,000 of
 * them — measured at +223ms on every re-sort. The Root mounts on first pointer
 * contact instead, so the idle page pays nothing.
 *
 * The wrapper span is rendered in *both* branches and carries the pointer
 * handlers itself. An earlier version swapped the trigger's DOM node when arming,
 * so Radix mounted mid-hover, never received the matching pointerleave, and the
 * tooltip stuck open forever. Open state is ours for the same reason.
 */
function Lazy({ copy, children }: { copy: string; children: React.ReactNode }) {
  const [armed, setArmed] = useState(false)
  const [open, setOpen] = useState(false)

  const show = () => {
    setArmed(true)
    setOpen(true)
  }
  const hide = () => setOpen(false)

  const trigger = (
    <span
      className="inline-flex cursor-help"
      tabIndex={0}
      aria-label={copy}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
    </span>
  )

  if (!armed) return trigger
  return (
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger asChild>{trigger}</Tooltip.Trigger>
      <Bubble copy={copy} />
    </Tooltip.Root>
  )
}

/** The Info icon as its own trigger, for the stat labels. */
export default function InfoTooltip({ copy }: { copy: string }) {
  return (
    <Lazy copy={copy}>
      <span className="inline-flex items-center text-brown-gravie-30 transition-colors hover:text-brown-gravie-50">
        <Info className="h-3.5 w-3.5" />
      </span>
    </Lazy>
  )
}

/**
 * Wraps a tag so the whole chip is the trigger — seven Info icons in the tag
 * column would be noise, and the chip is already an obvious hover target.
 */
export function Tip({ copy, children }: { copy: string; children: React.ReactNode }) {
  return (
    <Lazy copy={copy}>{children}</Lazy>
  )
}
