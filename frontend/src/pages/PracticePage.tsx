import { useEffect, useState } from 'react'
import { borderColor, chipColor, type Column } from '../columns'

type ColumnBreakdown = {
  place: Column
  minuend_digit: number
  subtrahend_digit: number
  borrows: boolean
}

type Problem = {
  minuend: number
  subtrahend: number
  answer: number
  columns: ColumnBreakdown[]
}

type Answers = Record<Column, string>

const EMPTY_ANSWERS: Answers = { hundreds: '', tens: '', ones: '' }

function DigitChip({ digit, column }: { digit: number; column: Column }) {
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-2xl font-display text-3xl font-bold text-ink shadow-[0_4px_0_rgba(0,0,0,0.15)] ${chipColor[column]}`}
    >
      {digit}
    </div>
  )
}

function AnswerBox({
  column,
  value,
  onChange,
}: {
  column: Column
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      className={`h-16 w-16 rounded-2xl border-4 bg-white text-center font-display text-3xl font-bold text-ink focus:outline-none ${borderColor[column]}`}
      maxLength={1}
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(-1))}
    />
  )
}

function StreakMeter({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-4 w-4 rounded-full ${i < filled ? 'bg-spark' : 'bg-ink/10'}`}
        />
      ))}
    </div>
  )
}

function formatMisconception(name: string): string {
  return name.replace(/_/g, ' ')
}

function PracticePage() {
  const [problem, setProblem] = useState<Problem | null>(null)
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)
  const [misconception, setMisconception] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)

  const fetchProblem = () => {
    fetch('http://127.0.0.1:8000/problem')
      .then((res) => res.json())
      .then((data: Problem) => {
        setProblem(data)
        setAnswers(EMPTY_ANSWERS)
        setFeedback(null)
        setMisconception(null)
        setHint(null)
      })
  }

  useEffect(fetchProblem, [])

  if (!problem) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <p className="font-display text-2xl font-bold">Loading problem...</p>
      </div>
    )
  }

  const allFilled = problem.columns.every((c) => answers[c.place] !== '')

  const checkAnswer = () => {
    const submitted_answer = Number(
      problem.columns.map((c) => answers[c.place]).join(''),
    )
    fetch('http://127.0.0.1:8000/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minuend: problem.minuend,
        subtrahend: problem.subtrahend,
        submitted_answer,
      }),
    })
      .then((res) => res.json())
      .then(
        (result: {
          correct: boolean
          misconception: string | null
          hint: string | null
        }) => {
          if (result.correct) {
            setFeedback('correct')
            setStreak((s) => s + 1)
            fetchProblem()
          } else {
            setFeedback('incorrect')
            setMisconception(result.misconception)
            setHint(result.hint)
            setStreak(0)
          }
        },
      )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-base px-4">
      <h1 className="font-display text-4xl font-bold">Let's subtract!</h1>

      <StreakMeter filled={Math.min(streak, 5)} total={5} />

      <div className="rounded-3xl bg-white p-8 shadow-[0_8px_0_rgba(0,0,0,0.1)]">
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-3">
            {problem.columns.map((c) => (
              <DigitChip key={c.place} digit={c.minuend_digit} column={c.place} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-bold">-</span>
            {problem.columns.map((c) => (
              <DigitChip key={c.place} digit={c.subtrahend_digit} column={c.place} />
            ))}
          </div>
          <div className="h-1 w-full rounded bg-ink/20" />
          <div className="flex gap-3">
            {problem.columns.map((c) => (
              <AnswerBox
                key={c.place}
                column={c.place}
                value={answers[c.place]}
                onChange={(value) =>
                  setAnswers((a) => ({ ...a, [c.place]: value }))
                }
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!allFilled}
          onClick={checkAnswer}
          className="mt-8 w-full rounded-2xl bg-ink py-3 font-display text-xl font-semibold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none disabled:opacity-40"
        >
          Check answer
        </button>

        {feedback === 'correct' && (
          <p className="mt-6 text-center font-display text-lg font-semibold text-spark">
            Correct!
          </p>
        )}
        {feedback === 'incorrect' && (
          <div className="mt-6 rounded-2xl border-l-8 border-helper bg-helper/10 p-4 text-left">
            <p className="font-display text-lg font-semibold text-ones">
              Not quite — try again!
            </p>
            {hint && <p className="mt-2">{hint}</p>}
            {misconception && (
              <p className="mt-2 text-sm text-ink/50">
                Diagnosed pattern: {formatMisconception(misconception)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PracticePage
