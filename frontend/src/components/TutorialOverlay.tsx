import { useState } from 'react'
import { borderColor, chipColor, type Column } from '../columns'

type Highlight = 'digits' | 'answer' | 'hint'

type Step = {
  highlight: Highlight
  caption: string
}

const STEPS: Step[] = [
  {
    highlight: 'digits',
    caption:
      'Numbers are colored by place: yellow is hundreds, blue is tens, red is ones.',
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

function ExampleChip({
  digit,
  column,
  highlighted,
}: {
  digit: number
  column: Column
  highlighted: boolean
}) {
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-2xl font-display text-2xl font-bold text-ink shadow-[0_4px_0_rgba(0,0,0,0.15)] transition-all duration-300 ${chipColor[column]} ${
        highlighted ? 'ring-4 ring-helper ring-offset-2 ring-offset-white' : ''
      }`}
    >
      {digit}
    </div>
  )
}

export default function TutorialOverlay({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0)
  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-base px-4">
      <h1 className="font-display text-3xl font-bold">How to play</h1>

      <div className="rounded-3xl bg-white p-8 shadow-[0_8px_0_rgba(0,0,0,0.1)]">
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-3">
            {EXAMPLE_TOP.map((c) => (
              <ExampleChip
                key={c.place}
                digit={c.digit}
                column={c.place}
                highlighted={step.highlight === 'digits'}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl font-bold">−</span>
            {EXAMPLE_BOTTOM.map((c) => (
              <ExampleChip
                key={c.place}
                digit={c.digit}
                column={c.place}
                highlighted={step.highlight === 'digits'}
              />
            ))}
          </div>
          <div className="h-1 w-full rounded bg-ink/20" />
          <div
            className={`flex gap-3 rounded-2xl transition-all duration-300 ${
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

        {step.highlight === 'hint' && (
          <div className="mt-6 rounded-2xl border-l-8 border-helper bg-helper/10 p-4 text-left">
            <p className="font-display text-sm font-semibold text-helper">
              Hint
            </p>
            <p className="text-sm">
              Look at the ones column: 2 is smaller than 8, so borrow from
              the tens column first.
            </p>
          </div>
        )}
      </div>

      <p className="max-w-sm text-center font-display text-lg">
        {step.caption}
      </p>

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
