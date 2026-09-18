import type { ReactNode } from 'react'

/**
 * The line that says whether a graded answer was right, the same on every grades 2–5 game and workshop page: 24 px
 * bold, green when right and dark red when wrong. K–1 pages never use it — they show no red text for a mistake.
 */
export default function Verdict({ correct, children }: { correct: boolean; children: ReactNode }) {
  return <p className={`font-display text-2xl font-bold ${correct ? 'text-success-text' : 'text-alert-text'}`}>{children}</p>
}
