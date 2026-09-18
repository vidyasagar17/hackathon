import { useEffect, useRef, type ReactNode } from 'react'
import { prefersReducedMotion } from '../motion'

/**
 * Building blocks for the "Watch how to play" demos. A demo step brings in exactly one new thing, and only that
 * thing moves (the one-thing-animates rule), so every piece a demo will show keeps its space from the start and is
 * only hidden until its step: nothing else on the table shifts when it arrives. Under prefers-reduced-motion,
 * pieces appear in place without moving.
 */

const ARRIVE_MS = 450

const OFFSETS = {
  above: 'translateY(-28px)',
  below: 'translateY(28px)',
  left: 'translateX(-40px)',
  right: 'translateX(40px)',
}

export type From = keyof typeof OFFSETS

/** The step a demo is on, for pieces that show from one step onwards. */
export type SceneProps = { step: number }

/**
 * Show `children` from step `at` onwards, moving in from `from` (a card dealt, a token set down) when the demo
 * steps forward onto `at`. Before that step the piece is hidden but keeps its space.
 */
export function Arrive({
  at,
  step,
  from = 'above',
  className = '',
  children,
}: {
  at: number
  step: number
  from?: From
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const previousStep = useRef(step)
  const shown = step >= at

  useEffect(() => {
    const arrived = step === at && previousStep.current === at - 1
    previousStep.current = step
    if (arrived && !prefersReducedMotion()) {
      ref.current?.animate([{ transform: OFFSETS[from], opacity: 0 }, { transform: 'none', opacity: 1 }], {
        duration: ARRIVE_MS,
        easing: 'ease-out',
      })
    }
  }, [at, from, step])

  return (
    <div ref={ref} aria-hidden={!shown} className={`${shown ? '' : 'invisible'} ${className}`}>
      {children}
    </div>
  )
}

/** Show `children` from step `at` onwards without moving: for a label that goes with a piece that does move. */
export function Reveal({ at, step, className = '', children }: { at: number; step: number; className?: string; children: ReactNode }) {
  const shown = step >= at
  return (
    <div aria-hidden={!shown} className={`${shown ? '' : 'invisible'} ${className}`}>
      {children}
    </div>
  )
}

/** A number or word on a small card, as the games' answer and number cards look. */
export function NumberTile({
  children,
  marked = false,
  covered,
  className = '',
}: {
  children?: ReactNode
  marked?: boolean
  covered?: ReactNode
  className?: string
}) {
  return (
    <span
      className={`flex h-14 min-w-14 items-center justify-center rounded-xl border-2 px-2 font-display text-2xl font-bold ${
        covered ? 'border-chalk/60 bg-felt-edge' : 'border-felt-edge bg-card text-ink'
      } ${marked ? 'ring-4 ring-hundreds ring-offset-2 ring-offset-felt' : ''} ${className}`}
    >
      {covered ?? children}
    </span>
  )
}

/** Chalk writing on the felt: a sign between cards, or a line of working. */
export function Chalk({ children, size = 'text-3xl' }: { children: ReactNode; size?: string }) {
  return <span className={`font-display font-bold text-chalk ${size}`}>{children}</span>
}

/** A short result on the table ("You win!", "Fits!", "Point!"), in the gold the games use for the right answer. */
export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-hundreds px-4 py-1 font-display text-xl font-bold text-ink">{children}</span>
}

/** A seat label on the table ("You", "Robo"), as the games' SeatName shows it, without a message. */
export function Seat({ name }: { name: string }) {
  return <span className="min-w-16 font-display text-xl font-bold text-chalk">{name}</span>
}
