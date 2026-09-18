import { useRef, useState } from 'react'
import type { TryIt } from '../intros/types'
import { prefersReducedMotion } from '../motion'
import { playSound } from '../sound'
import { speakWhenAllowed } from '../speech'
import { wobble } from '../wobble'
import ReadAloudButton from './ReadAloudButton'

/** The right tap's snap pulse (decision 1: at most 300 ms, only on the student's tap). */
const PULSE: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.4 }, { transform: 'scale(1)' }]
const PULSE_MS = 280

/**
 * The demo's last stop: one move from the game for the student to try. A wrong tap wobbles once and shows the
 * right way in ink on card (no red text); a right tap pulses once and cheers. It is practice only — nothing is
 * graded or sent to the server — and the student can press Play at any time. With `speakAloud` (K–1), each new
 * message is also spoken.
 */
export default function TryItPanel({ tryIt, speakAloud }: { tryIt: TryIt; speakAloud: boolean }) {
  const [wrongPicks, setWrongPicks] = useState<string[]>([])
  const [solved, setSolved] = useState(false)
  const choiceRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const pick = (choice: string) => {
    const button = choiceRefs.current[choice]
    if (choice === tryIt.answer) {
      setSolved(true)
      playSound('correct')
      if (!prefersReducedMotion()) button?.animate(PULSE, { duration: PULSE_MS, easing: 'ease-out' })
      if (speakAloud) speakWhenAllowed(tryIt.cheer)
      return
    }
    setWrongPicks((picks) => [...picks, choice])
    playSound('wrong')
    wobble(button)
    if (speakAloud) speakWhenAllowed(tryIt.nudge)
  }

  const message = solved ? tryIt.cheer : wrongPicks.length === 0 ? null : tryIt.nudge

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <p className="rounded-full bg-hundreds px-4 py-1 font-display text-lg font-bold text-ink">Your turn!</p>
      <p className="text-center font-display text-2xl font-bold text-chalk">{tryIt.ask}</p>
      <div className="flex flex-wrap items-center justify-center gap-6">
        {tryIt.picture}
        <div role="group" aria-label="Choices" className={`flex flex-wrap justify-center gap-3 ${tryIt.picture ? 'max-w-sm' : ''}`}>
          {tryIt.choices.map((choice) => {
            const isAnswer = solved && choice === tryIt.answer
            const ruledOut = wrongPicks.includes(choice)
            return (
              <button
                key={choice}
                ref={(element) => {
                  choiceRefs.current[choice] = element
                }}
                type="button"
                onClick={() => pick(choice)}
                disabled={solved || ruledOut}
                aria-label={isAnswer ? `${choice}, right` : choice}
                className={`tap-target rounded-2xl border-2 px-5 font-display text-2xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hundreds ${
                  isAnswer
                    ? 'border-felt-edge bg-spark text-ink ring-4 ring-hundreds ring-offset-2 ring-offset-felt'
                    : ruledOut
                      ? 'border-chalk/40 bg-felt-edge text-chalk'
                      : 'border-felt-edge bg-card text-ink'
                }`}
              >
                {choice}
              </button>
            )
          })}
        </div>
      </div>
      {message && (
        <div aria-live="polite" className="flex w-full max-w-md items-center gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 text-ink">
          <p className="flex-1 text-lg">{message}</p>
          <ReadAloudButton text={message} label="Hear it" />
        </div>
      )}
    </div>
  )
}
