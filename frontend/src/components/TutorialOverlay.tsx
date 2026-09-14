import { useState } from 'react'
import DigitChip from './DigitChip'
import ReadAloudButton from './ReadAloudButton'
import { borderColor, type Column } from '../columns'

type Highlight = 'digits' | 'answer' | 'hint'

type Step = {
  highlight: Highlight
  caption: string
}

const COLUMN_STEPS: Step[] = [
  {
    highlight: 'digits',
    caption:
      'Numbers are colored by place: yellow is hundreds, blue is tens, pink is ones.',
  },
  {
    highlight: 'answer',
    caption: 'Type your answer one digit at a time, then check it.',
  },
  {
    highlight: 'hint',
    caption:
      "Get it wrong? We'll show you exactly what to fix, not just that you're wrong.",
  },
]

const EXPRESSION_STEPS: Step[] = [
  {
    highlight: 'answer',
    caption: 'Type your answer one digit at a time, then check it.',
  },
  {
    highlight: 'hint',
    caption:
      "Get it wrong? We'll show you exactly what to fix, not just that you're wrong.",
  },
]

const EXAMPLE_TOP: { place: Column; digit: number }[] = [
  { place: 'hundreds', digit: 7 },
  { place: 'tens', digit: 4 },
  { place: 'ones', digit: 2 },
]
const EXAMPLE_BOTTOM: { place: Column; digit: number }[] = [
  { place: 'hundreds', digit: 1 },
  { place: 'tens', digit: 5 },
  { place: 'ones', digit: 8 },
]

export default function TutorialOverlay({
  onDone,
  usesColumnChips,
}: {
  onDone: () => void
  usesColumnChips: boolean
}) {
  const steps = usesColumnChips ? COLUMN_STEPS : EXPRESSION_STEPS
  const [stepIndex, setStepIndex] = useState(0)
  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-base px-4">
      <h1 className="font-display text-3xl font-bold">How to play</h1>

      <div className="rounded-3xl bg-white p-8 shadow-[0_8px_0_rgba(0,0,0,0.1)]">
        {usesColumnChips ? (
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-3">
              {EXAMPLE_TOP.map((c) => (
                <DigitChip
                  key={c.place}
                  digit={c.digit}
                  column={c.place}
                  size="sm"
                  highlighted={step.highlight === 'digits'}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl font-bold">−</span>
              {EXAMPLE_BOTTOM.map((c) => (
                <DigitChip
                  key={c.place}
                  digit={c.digit}
                  column={c.place}
                  size="sm"
                  highlighted={step.highlight === 'digits'}
                />
              ))}
            </div>
            <div className="h-1 w-full rounded bg-ink/20" />
            <div
              className={`flex gap-3 rounded-2xl transition-all duration-300 motion-reduce:transition-none ${
                step.highlight === 'answer'
                  ? 'ring-4 ring-helper ring-offset-2 ring-offset-white'
                  : ''
              }`}
            >
              {(['hundreds', 'tens', 'ones'] as Column[]).map((place) => (
                <div
                  key={place}
                  className={`h-14 w-14 rounded-2xl border-4 bg-white ${borderColor[place]}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="font-display text-3xl font-bold">84 ÷ 4</p>
            <div
              className={`flex gap-3 rounded-2xl transition-all duration-300 motion-reduce:transition-none ${
                step.highlight === 'answer'
                  ? 'ring-4 ring-helper ring-offset-2 ring-offset-white'
                  : ''
              }`}
            >
              <div className="h-14 w-14 rounded-2xl border-4 border-hundreds bg-white" />
              <div className="h-14 w-14 rounded-2xl border-4 border-tens bg-white" />
              <div className="h-14 w-14 rounded-2xl border-4 border-ones bg-white" />
            </div>
          </div>
        )}

        {step.highlight === 'hint' && (
          <div className="mt-6 rounded-2xl border-l-8 border-helper bg-helper/10 p-4 text-left">
            <p className="font-display text-sm font-semibold text-helper-text">
              Hint
            </p>
            <p className="text-sm">
              {usesColumnChips
                ? 'Look at the ones column: 2 is smaller than 8, so borrow from the tens column first.'
                : "Don't stop after the tens digit — bring down the ones digit and keep going."}
            </p>
          </div>
        )}
      </div>

      <div className="flex max-w-sm flex-col items-center gap-3">
        <p className="text-center font-display text-lg">{step.caption}</p>
        <ReadAloudButton text={step.caption} />
      </div>

      <button
        type="button"
        onClick={() => (isLast ? onDone() : setStepIndex((i) => i + 1))}
        className="rounded-2xl bg-ink px-8 py-4 font-display text-xl font-semibold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none"
      >
        {isLast ? "Let's go!" : 'Next'}
      </button>
    </div>
  )
}
