import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../motion'

export type Progress = {
  level: number
  correct_in_a_row: number
  needed: number
  top_level: number
}

function Star({ filled, ref }: { filled: boolean; ref: (element: SVGSVGElement | null) => void }) {
  return (
    <svg ref={ref} viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9">
      <path
        d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"
        className={`stroke-ink ${filled ? 'fill-spark' : 'fill-none'}`}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function progressMessage({ level, correct_in_a_row, needed, top_level }: Progress): string {
  if (level >= top_level) return 'Top level!'
  const remaining = needed - correct_in_a_row
  if (remaining === 0) return `Level ${level + 1} is next!`
  return `${remaining} more right in a row to reach Level ${level + 1}`
}

/**
 * Stars toward the next level. Mirrors the server's rule: correct answers in a row at this level.
 *
 * When a star is gained, one short animation plays (Phase 1 decision 1): the new star pops
 * (400 ms), or, when that star completes a level below the top, a ring pulses around the stars
 * (1.2 s). Nothing plays when `canCelebrate` is false (a math animation is running) or the
 * device asks for reduced motion.
 */
export default function ProgressMeter({
  progress,
  canCelebrate,
}: {
  progress: Progress
  canCelebrate: boolean
}) {
  const starRefs = useRef<(SVGSVGElement | null)[]>([])
  const starsRef = useRef<HTMLDivElement>(null)
  const previousCount = useRef(progress.correct_in_a_row)
  const { level, correct_in_a_row, needed, top_level } = progress

  useEffect(() => {
    const gainedStar = correct_in_a_row > previousCount.current
    previousCount.current = correct_in_a_row
    if (!gainedStar || !canCelebrate || prefersReducedMotion()) return

    if (correct_in_a_row === needed && level < top_level) {
      starsRef.current?.animate(
        [
          { boxShadow: '0 0 0 0 rgba(61, 220, 151, 0.8)' },
          { boxShadow: '0 0 0 18px rgba(61, 220, 151, 0)' },
        ],
        { duration: 1200, easing: 'ease-out' },
      )
      return
    }
    starRefs.current[correct_in_a_row - 1]?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 400, easing: 'ease-out' },
    )
  }, [correct_in_a_row, needed, level, top_level, canCelebrate])

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      <p className="font-display text-xl font-bold">Level {level}</p>
      <div
        ref={starsRef}
        role="img"
        aria-label={`${correct_in_a_row} of ${needed} stars`}
        className="flex gap-2 rounded-full px-2 py-1"
      >
        {Array.from({ length: needed }, (_, i) => (
          <Star
            key={i}
            filled={i < correct_in_a_row}
            ref={(element) => {
              starRefs.current[i] = element
            }}
          />
        ))}
      </div>
      <p className="text-ink-muted">{progressMessage(progress)}</p>
    </div>
  )
}
