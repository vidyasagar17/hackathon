/** True when the device asks for less motion (the prefers-reduced-motion setting). */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
