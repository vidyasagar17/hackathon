import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { borderColor, chipColor, type Column } from '../columns'
import { formatMisconception } from '../format'
import { getSessionId } from '../session'

type GameConfig = {
  heading: string
  operatorSymbol: string
  topDigitField: string
  bottomDigitField: string
  regroupField: string
  transferDirection: 'from-left' | 'to-left'
  badgeLabel: string
  sourceMark: string
  destMark: string
}

const GAME_CONFIGS: Record<string, GameConfig> = {
  subtraction: {
    heading: "Let's subtract!",
    operatorSymbol: '−',
    topDigitField: 'minuend_digit',
    bottomDigitField: 'subtrahend_digit',
    regroupField: 'borrows',
    transferDirection: 'from-left',
    badgeLabel: '10',
    sourceMark: '−1',
    destMark: '+10',
  },
  addition: {
    heading: "Let's add!",
    operatorSymbol: '+',
    topDigitField: 'addend1_digit',
    bottomDigitField: 'addend2_digit',
    regroupField: 'carries',
    transferDirection: 'to-left',
    badgeLabel: '1',
    sourceMark: '10+',
    destMark: '+1',
  },
  multiplication: {
    heading: "Let's multiply!",
    operatorSymbol: '×',
    topDigitField: 'multiplicand_digit',
    bottomDigitField: 'multiplier_digit',
    regroupField: 'carries',
    transferDirection: 'to-left',
    badgeLabel: '1',
    sourceMark: '10+',
    destMark: '+1',
  },
}

const PLACE_ORDER: Column[] = ['hundreds', 'tens', 'ones']
const PROCESSING_ORDER: Column[] = ['ones', 'tens', 'hundreds']
const CHIP_SPACING = 76
const STEP_DURATION = 900

type ColumnBreakdown = {
  place: Column
  [key: string]: unknown
}

type Problem = {
  answer: number
  columns: ColumnBreakdown[]
  difficulty: number
}

type Answers = Record<Column, string>
type RegroupStep = { from: Column; to: Column }

const EMPTY_ANSWERS: Answers = { hundreds: '', tens: '', ones: '' }

function buildRegroupSteps(problem: Problem, config: GameConfig): RegroupStep[] {
  const byPlace = Object.fromEntries(
    problem.columns.map((c) => [c.place, c]),
  ) as Record<Column, ColumnBreakdown>
  const steps: RegroupStep[] = []

  for (const place of PROCESSING_ORDER) {
    const idx = PLACE_ORDER.indexOf(place)
    const neighbor = idx > 0 ? PLACE_ORDER[idx - 1] : null
    if (!neighbor) continue
    if (!byPlace[place]?.[config.regroupField]) continue
    steps.push(
      config.transferDirection === 'from-left'
        ? { from: neighbor, to: place }
        : { from: place, to: neighbor },
    )
  }
  return steps
}

function DigitChip({
  digit,
  column,
  highlighted,
}: {
  digit: number
  column: Column
  highlighted?: boolean
}) {
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-2xl font-display text-3xl font-bold text-ink shadow-[0_4px_0_rgba(0,0,0,0.15)] transition-shadow duration-300 ${chipColor[column]} ${highlighted ? 'ring-4 ring-helper ring-offset-2 ring-offset-base' : ''}`}
    >
      {digit}
    </div>
  )
}

function RegroupTopChip({
  digit,
  column,
  config,
  step,
  active,
}: {
  digit: number
  column: Column
  config: GameConfig
  step: { fromStep?: number; toStep?: number; toPlace?: Column }
  active: number | null
}) {
  const isFromActive = step.fromStep === active
  const isFromSettled = step.fromStep !== undefined && active !== null && active > step.fromStep
  const isToActive = step.toStep === active
  const isToSettled = step.toStep !== undefined && active !== null && active > step.toStep

  const direction =
    isFromActive && step.toPlace
      ? Math.sign(PLACE_ORDER.indexOf(step.toPlace) - PLACE_ORDER.indexOf(column))
      : 0

  const badgeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isFromActive || !badgeRef.current) return
    badgeRef.current.animate(
      [
        { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, 0) scale(1)', opacity: 1, offset: 0.25 },
        {
          transform: `translate(calc(-50% + ${direction * CHIP_SPACING}px), 0) scale(1)`,
          opacity: 1,
        },
      ],
      { duration: 700, easing: 'ease-out', fill: 'forwards' },
    )
  }, [isFromActive, direction])

  return (
    <div className="relative">
      <DigitChip digit={digit} column={column} highlighted={isFromActive || isToActive} />

      {isFromActive && (
        <span
          ref={badgeRef}
          className="absolute -top-9 left-1/2 rounded-full bg-ink px-2.5 py-1 font-display text-sm font-bold text-base shadow-md"
        >
          {config.badgeLabel}
        </span>
      )}

      {(isFromSettled || isFromActive) && (
        <span className="absolute -right-2 -top-2 rounded-full bg-ones px-1.5 py-0.5 font-display text-[10px] font-bold text-base">
          {config.sourceMark}
        </span>
      )}
      {(isToSettled || isToActive) && (
        <span className="absolute -left-2 -top-2 rounded-full bg-spark px-1.5 py-0.5 font-display text-[10px] font-bold text-base">
          {config.destMark}
        </span>
      )}
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

function PracticePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const config = gameId ? GAME_CONFIGS[gameId] : undefined

  const [problem, setProblem] = useState<Problem | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [feedback, setFeedback] = useState<
    'correct' | 'incorrect' | 'error' | null
  >(null)
  const [misconception, setMisconception] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [attemptCount, setAttemptCount] = useState(0)
  const [regroupSteps, setRegroupSteps] = useState<RegroupStep[]>([])
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const fetchProblem = () => {
    setLoadError(false)
    fetch(
      `http://127.0.0.1:8000/games/${gameId}/problem?session_id=${getSessionId()}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load problem')
        return res.json()
      })
      .then((data: Problem) => {
        setProblem(data)
        setAnswers(EMPTY_ANSWERS)
        setFeedback(null)
        setMisconception(null)
        setHint(null)
        setAttemptCount(0)
        setRegroupSteps([])
        setActiveStep(null)
        setRevealed(false)
      })
      .catch(() => setLoadError(true))
  }

  useEffect(() => {
    if (config) fetchProblem()
  }, [gameId])

  useEffect(() => {
    if (activeStep === null || activeStep >= regroupSteps.length) return
    const timer = setTimeout(() => setActiveStep((s) => (s ?? 0) + 1), STEP_DURATION)
    return () => clearTimeout(timer)
  }, [activeStep, regroupSteps.length])

  useEffect(() => {
    if (activeStep !== null && activeStep >= regroupSteps.length && regroupSteps.length > 0) {
      const timer = setTimeout(() => setRevealed(true), 400)
      return () => clearTimeout(timer)
    }
  }, [activeStep, regroupSteps.length])

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <p className="font-display text-2xl font-bold text-ones">
          Unknown game.
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base">
        <p className="font-display text-2xl font-bold text-ones">
          Couldn't load a problem — try again.
        </p>
        <button
          type="button"
          onClick={fetchProblem}
          className="rounded-2xl bg-ink px-6 py-3 font-display font-semibold text-base"
        >
          Retry
        </button>
      </div>
    )
  }

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
    fetch(`http://127.0.0.1:8000/games/${gameId}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        problem,
        submitted_answer,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to check answer')
        return res.json()
      })
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
            return
          }

          setStreak(0)
          const nextAttempt = attemptCount + 1
          setAttemptCount(nextAttempt)

          if (nextAttempt < 2) {
            setFeedback('incorrect')
            return
          }

          setMisconception(result.misconception)
          setHint(result.hint)
          const steps = buildRegroupSteps(problem, config)
          if (steps.length === 0) {
            setFeedback('incorrect')
            setRevealed(true)
            return
          }
          setFeedback('incorrect')
          setRegroupSteps(steps)
          setActiveStep(0)
        },
      )
      .catch(() => setFeedback('error'))
  }

  const fromSteps: Partial<Record<Column, number>> = {}
  const toSteps: Partial<Record<Column, number>> = {}
  const toPlaceByFrom: Partial<Record<Column, Column>> = {}
  regroupSteps.forEach((s, i) => {
    fromSteps[s.from] = i
    toSteps[s.to] = i
    toPlaceByFrom[s.from] = s.to
  })

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 bg-base px-4">
      <Link
        to="/summary"
        className="absolute right-6 top-4 font-display font-semibold text-ink/70"
      >
        Session summary
      </Link>

      <h1 className="font-display text-4xl font-bold">{config.heading}</h1>

      <div className="flex flex-col items-center gap-2">
        <span className="rounded-full bg-ink/10 px-3 py-1 font-display text-sm font-semibold text-ink/70">
          Level {problem.difficulty}
        </span>
        <StreakMeter filled={Math.min(streak, 5)} total={5} />
      </div>

      <div className="rounded-3xl bg-white p-8 pt-12 shadow-[0_8px_0_rgba(0,0,0,0.1)]">
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-3">
            {problem.columns.map((c) => (
              <RegroupTopChip
                key={c.place}
                digit={c[config.topDigitField] as number}
                column={c.place}
                config={config}
                step={{
                  fromStep: fromSteps[c.place],
                  toStep: toSteps[c.place],
                  toPlace: toPlaceByFrom[c.place],
                }}
                active={activeStep}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-bold">
              {config.operatorSymbol}
            </span>
            {problem.columns.map((c) => (
              <DigitChip
                key={c.place}
                digit={c[config.bottomDigitField] as number}
                column={c.place}
              />
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
        {feedback === 'error' && (
          <p className="mt-6 text-center font-display text-lg font-semibold text-ones">
            Couldn't check your answer — try again.
          </p>
        )}
        {feedback === 'incorrect' && (
          <div className="mt-6 rounded-2xl border-l-8 border-helper bg-helper/10 p-4 text-left">
            <p className="font-display text-lg font-semibold text-ones">
              Not quite — try again!
            </p>
            {revealed && hint && <p className="mt-2">{hint}</p>}
            {revealed && misconception && (
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
