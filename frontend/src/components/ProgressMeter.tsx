export type Progress = {
  level: number
  correct_in_a_row: number
  needed: number
  top_level: number
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9">
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

/** Stars toward the next level. Mirrors the server's rule: correct answers in a row at this level. */
export default function ProgressMeter({ progress }: { progress: Progress }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-display text-xl font-bold">Level {progress.level}</p>
      <div
        role="img"
        aria-label={`${progress.correct_in_a_row} of ${progress.needed} stars`}
        className="flex gap-2"
      >
        {Array.from({ length: progress.needed }, (_, i) => (
          <Star key={i} filled={i < progress.correct_in_a_row} />
        ))}
      </div>
      <p className="text-ink-muted">{progressMessage(progress)}</p>
    </div>
  )
}
