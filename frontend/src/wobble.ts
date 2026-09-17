import { prefersReducedMotion } from './motion'

/** A short side-to-side wobble on a wrong pick (decision 1: at most 500 ms, only on the student's tap). */
const WOBBLE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-8px)' },
  { transform: 'translateX(8px)' },
  { transform: 'translateX(-4px)' },
  { transform: 'translateX(0)' },
]

const WOBBLE_MS = 400

/** Wobble an element once, unless the student prefers reduced motion. */
export function wobble(element: HTMLElement | null | undefined) {
  if (!prefersReducedMotion()) element?.animate(WOBBLE, { duration: WOBBLE_MS })
}
