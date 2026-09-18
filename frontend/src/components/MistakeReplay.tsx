import { useEffect, useRef, useState } from 'react'
import { placeLetter, type Column } from '../columns'
import { prefersReducedMotion } from '../motion'
import { firstDivergence, type ReplayStep } from '../replay'

/**
 * "Show me what I did": the student's own work replayed column by column beside the
 * correct work, pausing on the place where the two part company.
 *
 * Only ever one digit lands at a time, and only when the student presses Next, so this
 * stays inside the one-thing-animates rule. Under prefers-reduced-motion the digits
 * appear without moving; the walk itself still works.
 */

const LAND_MS = 260

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

/** A digit that drops into place when its step arrives. */
function LandingDigit({ digit, show, wrong }: { digit: number; show: boolean; wrong: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!show || !ref.current || prefersReducedMotion()) return
    ref.current.animate(
      [
        { transform: 'translateY(-10px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { duration: LAND_MS, easing: 'ease-out', fill: 'forwards' },
    )
  }, [show])

  return (
    <span
      className={`inline-flex h-12 w-10 items-center justify-center rounded-lg border-2 font-display text-2xl font-bold ${
        wrong ? 'border-alert-text bg-ones/25 text-ink' : 'border-felt-edge bg-white text-ink'
      }`}
    >
      {show ? (
        <span ref={ref} className="block">
          {digit}
        </span>
      ) : (
        <span aria-hidden="true" className="text-ink/20">
          ?
        </span>
      )}
    </span>
  )
}

/** One side's answer row: its digits in place order, filled in as the walk reaches them. */
function AnswerRow({
  steps,
  upto,
  pick,
  markWrong,
  label,
}: {
  steps: ReplayStep[]
  upto: number
  pick: (step: ReplayStep) => number
  markWrong: boolean
  label: string
}) {
  // Steps run right to left; the row is drawn left to right.
  const drawn = [...steps].reverse()

  return (
    <div className="flex flex-col items-center gap-2">
      <h4 className="font-display text-base font-bold text-ink-muted">{label}</h4>
      <div className="flex gap-1">
        {drawn.map((step) => {
          const index = steps.indexOf(step)
          return (
            <LandingDigit
              key={step.place}
              digit={pick(step)}
              show={index <= upto}
              wrong={markWrong && index <= upto && !step.matches}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function MistakeReplay({
  steps,
  operator,
  explanation,
}: {
  steps: ReplayStep[]
  /** The problem's sign, shown beside the column being worked. */
  operator: string
  /** The hint sentence for the diagnosed bug, shown once the walk reaches the divergence. */
  explanation: string
}) {
  const [upto, setUpto] = useState(-1)
  const diverges = firstDivergence(steps)
  const done = upto >= steps.length - 1
  const current = upto >= 0 ? steps[upto] : null
  const reached = diverges !== null && upto >= diverges

  return (
    <section
      aria-labelledby="replay"
      className="flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-felt-edge bg-card p-4"
    >
      <h3 id="replay" className="font-display text-xl font-bold">
        What you did, step by step
      </h3>

      <div className="flex flex-wrap items-start justify-center gap-8">
        <AnswerRow steps={steps} upto={upto} pick={(s) => s.yours} markWrong label="Your way" />
        <AnswerRow
          steps={steps}
          upto={upto}
          pick={(s) => s.right}
          markWrong={false}
          label="The right way"
        />
      </div>

      <p aria-live="polite" className="min-h-14 max-w-md text-center text-lg">
        {current === null
          ? 'Press Next to walk through it one place at a time.'
          : `${placeLetter[current.place as Column]}: ${current.topDigit} ${operator} ${current.bottomDigit}. You wrote ${current.yours}${current.matches ? ', which is right.' : `, and ${current.right} belongs here.`}`}
      </p>

      {reached && <p className="max-w-md text-center text-lg font-semibold">{explanation}</p>}

      <button
        type="button"
        disabled={done}
        onClick={() => setUpto((step) => step + 1)}
        className={`tap-target rounded-2xl bg-ink px-8 font-display text-xl font-bold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none disabled:opacity-40 ${FOCUS_RING}`}
      >
        {done ? 'That’s the whole thing' : upto < 0 ? 'Next' : 'Next place'}
      </button>
    </section>
  )
}
