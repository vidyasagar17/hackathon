import type { ReactNode } from 'react'
import { formatMisconception } from '../format'
import LightbulbIcon from './LightbulbIcon'
import ReadAloudButton from './ReadAloudButton'

/**
 * The lightbulb "Show me why" for a wrong answer in a grades 2–5 game panel: the button until the hint arrives, then
 * an optional picture, the hint sentence, and one row with the diagnosed pattern and "Read the hint aloud" (one row
 * keeps the panel short on a 768 px tablet). The diagnosis stays visible whenever there is one.
 */
export default function HintPanel({
  wrong,
  hint,
  hintError,
  misconception,
  onShowWhy,
  picture,
}: {
  wrong: boolean
  hint: string | null
  hintError: boolean
  misconception: string | null
  onShowWhy: () => void
  picture?: ReactNode
}) {
  return (
    <>
      {wrong && hint === null && (
        <button
          type="button"
          onClick={onShowWhy}
          className="tap-target inline-flex items-center gap-2 self-start rounded-2xl border-4 border-ink bg-white px-6 font-display text-xl font-semibold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2"
        >
          <LightbulbIcon />
          Show me why
        </button>
      )}
      {hintError && <p className="font-display text-lg font-semibold text-alert-text">Couldn't load the hint — try again.</p>}
      {hint && (
        <div className="flex w-full flex-col items-start gap-2">
          {picture}
          <p className="text-lg">{hint}</p>
          <div className="flex w-full items-center justify-between gap-2">
            <p className="text-sm text-ink-muted">{misconception && `Diagnosed pattern: ${formatMisconception(misconception)}`}</p>
            <ReadAloudButton text={hint} label="Read the hint aloud" />
          </div>
        </div>
      )}
    </>
  )
}
