import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import DigitChip from '../components/DigitChip'
import HomeButton from '../components/HomeButton'
import Keypad from '../components/Keypad'
import MuteToggle from '../components/MuteToggle'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import TutorialOverlay from '../components/TutorialOverlay'
import { API_URL } from '../api'
import {
  columnEntryOrder,
  EMPTY_ANSWERS,
  shiftIntoPlaces,
  type Answers,
} from '../answerEntry'
import { answerFill, type Column } from '../columns'
import { formatMisconception } from '../format'
import { getGradeBand } from '../gradeBand'
import { prefersReducedMotion } from '../motion'
import { buildRegroupSteps, PLACE_ORDER, type RegroupStep } from '../regroup'
import { getSessionId } from '../session'
import { playSound } from '../sound'
import { hasSeenTutorial, markTutorialSeen } from '../tutorial'

type GameConfig = {
  heading: string
  operatorSymbol: string
  spokenProblem: (problem: Problem) => string
  displayMode: 'columns' | 'expression'
  entryMode: 'columns' | 'shift'
  topDigitField: string
  bottomDigitField: string
  regroupField: string
  transferDirection: 'from-left' | 'to-left'
  badgeLabel: string
  sourceMark: string
  destMark: string
  carryField?: string
}

const GAME_CONFIGS: Record<string, GameConfig> = {
  subtraction: {
    heading: "Let's subtract!",
    operatorSymbol: '−',
    spokenProblem: (p) => `${p.minuend} minus ${p.subtrahend}`,
    displayMode: 'columns',
    entryMode: 'columns',
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
    spokenProblem: (p) => `${p.addend1} plus ${p.addend2}`,
    displayMode: 'columns',
    entryMode: 'columns',
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
    spokenProblem: (p) => `${p.multiplicand} times ${p.multiplier}`,
    displayMode: 'columns',
    entryMode: 'columns',
    topDigitField: 'multiplicand_digit',
    bottomDigitField: 'multiplier_digit',
    regroupField: 'carries',
    transferDirection: 'to-left',
    badgeLabel: '1',
    sourceMark: '10+',
    destMark: '+1',
    carryField: 'carry',
  },
  division: {
    heading: "Let's divide!",
    operatorSymbol: '÷',
    spokenProblem: (p) => `${p.dividend} divided by ${p.divisor}`,
    displayMode: 'expression',
    entryMode: 'shift',
    topDigitField: '',
    bottomDigitField: '',
    regroupField: 'regroups',
    transferDirection: 'to-left',
    badgeLabel: '',
    sourceMark: '',
    destMark: '',
  },
}

const CHIP_SPACING = 76
const STEP_DURATION = 900

type ColumnBreakdown = {
  place: Column
  [key: string]: unknown
}

type Problem = {
  answer: number
  columns: ColumnBreakdown[]
  answer_places: Column[]
  difficulty: number
  [key: string]: unknown
}

type ProblemPayload = {
  problem: Problem
  progress: Progress
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
  step: {
    fromStep?: number
    toStep?: number
    toPlace?: Column
    badge?: string
    destMark?: string
  }
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
    const destination = `translate(calc(-50% + ${direction * CHIP_SPACING}px), 0) scale(1)`
    if (prefersReducedMotion()) {
      badgeRef.current.style.transform = destination
      return
    }
    badgeRef.current.animate(
      [
        { transform: 'translate(-50%, 0) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, 0) scale(1)', opacity: 1, offset: 0.25 },
        { transform: destination, opacity: 1 },
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
          {step.badge}
        </span>
      )}

      {(isFromSettled || isFromActive) && (
        <span className="absolute -right-2 -top-2 rounded-full bg-ones px-1.5 py-0.5 font-display text-[10px] font-bold text-ink">
          {config.sourceMark}
        </span>
      )}
      {(isToSettled || isToActive) && (
        <span className="absolute -left-2 -top-2 rounded-full bg-spark px-1.5 py-0.5 font-display text-[10px] font-bold text-ink">
          {step.destMark}
        </span>
      )}
    </div>
  )
}

function AnswerBox({
  column,
  value,
  onChange,
  active,
  onSelect,
  usesKeypad,
}: {
  column: Column
  value: string
  onChange: (value: string) => void
  active: boolean
  onSelect: () => void
  usesKeypad: boolean
}) {
  return (
    <input
      aria-label={`${column.charAt(0).toUpperCase()}${column.slice(1)} digit of your answer`}
      className={`tap-target h-16 w-16 rounded-2xl border-4 border-ink text-center font-display text-3xl font-bold text-ink focus:outline-none focus:ring-4 focus:ring-helper focus:ring-offset-2 ${active ? 'ring-4 ring-helper ring-offset-2' : ''} ${answerFill[column]}`}
      maxLength={1}
      inputMode={usesKeypad ? 'none' : 'numeric'}
      value={value}
      onFocus={onSelect}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(-1))}
    />
  )
}

function requestProblem(gameId: string | undefined): Promise<ProblemPayload> {
  return fetch(
    `${API_URL}/games/${gameId}/problem?session_id=${getSessionId()}`,
  ).then((res) => {
    if (!res.ok) throw new Error('Failed to load problem')
    return res.json()
  })
}

function PracticePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const config = gameId ? GAME_CONFIGS[gameId] : undefined

  const [tutorialDone, setTutorialDone] = useState(hasSeenTutorial)
  const [gradeBand] = useState(getGradeBand)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS)
  const [activePlace, setActivePlace] = useState<Column | null>(null)
  const [feedback, setFeedback] = useState<
    'correct' | 'incorrect' | 'error' | null
  >(null)
  const [misconception, setMisconception] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [regroupSteps, setRegroupSteps] = useState<RegroupStep[]>([])
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [wrongAnswer, setWrongAnswer] = useState<number | null>(null)
  const hintRequest = useRef<AbortController | null>(null)

  const showProblem = useCallback((data: ProblemPayload) => {
    hintRequest.current?.abort()
    setWrongAnswer(null)
    setProblem(data.problem)
    setProgress(data.progress)
    setAnswers(EMPTY_ANSWERS)
    setActivePlace(null)
    setFeedback(null)
    setMisconception(null)
    setHint(null)
    setAttemptCount(0)
    setRegroupSteps([])
    setActiveStep(null)
    setRevealed(false)
  }, [])

  const fetchProblem = () => {
    setLoadError(false)
    requestProblem(gameId)
      .then(showProblem)
      .catch(() => setLoadError(true))
  }

  useEffect(() => {
    if (!config) return
    let stale = false
    requestProblem(gameId)
      .then((data) => {
        if (!stale) showProblem(data)
      })
      .catch(() => {
        if (!stale) setLoadError(true)
      })
    return () => {
      stale = true
    }
  }, [gameId, config, showProblem])

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
        <p className="font-display text-2xl font-bold text-alert-text">
          Unknown game.
        </p>
      </div>
    )
  }

  if (!tutorialDone) {
    return (
      <TutorialOverlay
        usesColumnChips={config.displayMode === 'columns'}
        onDone={() => {
          markTutorialSeen()
          setTutorialDone(true)
        }}
      />
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col bg-base">
        <AppHeader left={<HomeButton />} right={<MuteToggle />} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="font-display text-2xl font-bold text-alert-text">
            Couldn't load a problem — try again.
          </p>
          <button
            type="button"
            onClick={fetchProblem}
            className="tap-target rounded-2xl bg-ink px-6 py-3 font-display font-semibold text-base"
          >
            Retry
          </button>
        </main>
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

  const places = problem.answer_places
  const digits = places.map((place) => answers[place])
  const firstTyped = digits.findIndex((d) => d !== '')
  const readyToCheck =
    firstTyped !== -1 && digits.slice(firstTyped).every((d) => d !== '')
  const usesKeypad = gradeBand === '2-3'
  const entryOrder = columnEntryOrder(places)
  const currentPlace = activePlace ?? entryOrder[0]

  const pressDigit = (digit: string) => {
    playSound('tap')
    if (config.entryMode === 'shift') {
      setAnswers(shiftIntoPlaces(places, digits.join('') + digit))
      return
    }
    setAnswers((a) => ({ ...a, [currentPlace]: digit }))
    const next = entryOrder[entryOrder.indexOf(currentPlace) + 1]
    if (next) setActivePlace(next)
  }

  const pressDelete = () => {
    playSound('tap')
    if (config.entryMode === 'shift') {
      setAnswers(shiftIntoPlaces(places, digits.join('').slice(0, -1)))
      return
    }
    if (answers[currentPlace] !== '') {
      setAnswers((a) => ({ ...a, [currentPlace]: '' }))
      return
    }
    const previous = entryOrder[entryOrder.indexOf(currentPlace) - 1]
    if (!previous) return
    setAnswers((a) => ({ ...a, [previous]: '' }))
    setActivePlace(previous)
  }

  const fetchHint = (submitted_answer: number) => {
    hintRequest.current?.abort()
    const request = new AbortController()
    hintRequest.current = request
    fetch(`${API_URL}/games/${gameId}/hint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem, submitted_answer }),
      signal: request.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load hint')
        return res.json()
      })
      .then((result: { hint: string | null }) => setHint(result.hint))
      .catch(() => setHint(null))
  }

  const checkAnswer = () => {
    const submitted_answer = Number(digits.join(''))
    setChecking(true)
    fetch(`${API_URL}/games/${gameId}/check`, {
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
        }) => {
          if (result.correct) {
            playSound('correct')
            setFeedback('correct')
            setProgress((p) =>
              p && { ...p, correct_in_a_row: Math.min(p.correct_in_a_row + 1, p.needed) },
            )
            return
          }

          playSound('wrong')
          setWrongAnswer(submitted_answer)
          setProgress((p) => p && { ...p, correct_in_a_row: 0 })
          const nextAttempt = attemptCount + 1
          setAttemptCount(nextAttempt)

          if (nextAttempt < 2) {
            setFeedback('incorrect')
            return
          }

          setFeedback('incorrect')
          setMisconception(result.misconception)
          setHint(null)
          fetchHint(submitted_answer)
          if (activeStep !== null || revealed) return
          const steps = buildRegroupSteps(problem.columns, config)
          if (steps.length === 0) {
            setRevealed(true)
            return
          }
          setRegroupSteps(steps)
          setActiveStep(0)
        },
      )
      .catch(() => setFeedback('error'))
      .finally(() => setChecking(false))
  }

  const fromSteps: Partial<Record<Column, number>> = {}
  const toSteps: Partial<Record<Column, number>> = {}
  const toPlaceByFrom: Partial<Record<Column, Column>> = {}
  const badgeByFrom: Partial<Record<Column, string>> = {}
  const destMarkByTo: Partial<Record<Column, string>> = {}
  regroupSteps.forEach((s, i) => {
    fromSteps[s.from] = i
    toSteps[s.to] = i
    toPlaceByFrom[s.from] = s.to
    badgeByFrom[s.from] = s.badge
    destMarkByTo[s.to] = s.destMark
  })

  const checkDisabled =
    !readyToCheck ||
    checking ||
    feedback === 'correct' ||
    Number(digits.join('')) === wrongAnswer

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader
        left={<HomeButton />}
        right={
          <>
            <MuteToggle />
            <Link
              to="/summary"
              className="tap-target inline-flex items-center px-2 font-display font-semibold text-ink-muted"
            >
              Session summary
            </Link>
          </>
        }
      />

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-8">
        <div className="flex flex-col items-center gap-3">
          <h1 className="font-display text-4xl font-bold">{config.heading}</h1>
          <ReadAloudButton text={config.spokenProblem(problem)} label="Read the problem aloud" />
        </div>

        {progress && (
          <ProgressMeter
            progress={progress}
            canCelebrate={activeStep === null || activeStep >= regroupSteps.length}
          />
        )}

        <div className="rounded-3xl bg-white p-8 pt-12 shadow-[0_8px_0_rgba(0,0,0,0.1)]">
          <div className="flex flex-col items-center gap-3">
            {config.displayMode === 'expression' ? (
              <p className="font-display text-4xl font-bold">
                {String(problem.dividend)} {config.operatorSymbol}{' '}
                {String(problem.divisor)}
              </p>
            ) : (
              <div className="flex w-full flex-col items-end gap-3">
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
                        badge: badgeByFrom[c.place],
                        destMark: destMarkByTo[c.place],
                      }}
                      active={activeStep}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-3xl font-bold">
                    {config.operatorSymbol}
                  </span>
                  {problem.columns.map((c) => {
                    const digit = c[config.bottomDigitField] as number | null
                    return digit === null ? (
                      <div key={c.place} className="h-16 w-16" />
                    ) : (
                      <DigitChip key={c.place} digit={digit} column={c.place} />
                    )
                  })}
                </div>
                <div className="h-1 w-full rounded bg-ink/20" />
              </div>
            )}
            <div
              className={`flex gap-3 ${config.displayMode === 'columns' ? 'self-end' : ''}`}
            >
              {places.map((place) => (
                <AnswerBox
                  key={place}
                  column={place}
                  value={answers[place]}
                  onChange={(value) =>
                    setAnswers((a) => ({ ...a, [place]: value }))
                  }
                  active={usesKeypad && config.entryMode === 'columns' && place === currentPlace}
                  onSelect={() => setActivePlace(place)}
                  usesKeypad={usesKeypad}
                />
              ))}
            </div>
          </div>

          {usesKeypad ? (
            <div className="mt-8 flex justify-center">
              <Keypad
                onDigit={pressDigit}
                onDelete={pressDelete}
                onCheck={checkAnswer}
                checkDisabled={checkDisabled}
              />
            </div>
          ) : (
            <button
              type="button"
              disabled={checkDisabled}
              onClick={checkAnswer}
              className="tap-target mt-8 w-full rounded-2xl bg-ink py-3 font-display text-xl font-semibold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none disabled:opacity-40"
            >
              Check answer
            </button>
          )}

          {feedback === 'correct' && (
            <p className="mt-6 text-center font-display text-lg font-semibold text-success-text">
              Correct!
            </p>
          )}
          {feedback === 'error' && (
            <p className="mt-6 text-center font-display text-lg font-semibold text-alert-text">
              Couldn't check your answer — try again.
            </p>
          )}
          {feedback === 'incorrect' && (
            <div className="mt-6 rounded-2xl border-l-8 border-helper bg-helper/10 p-4 text-left">
              <p className="font-display text-lg font-semibold text-alert-text">
                Not quite — try again!
              </p>
              {revealed && hint && (
                <div className="mt-2 flex flex-col items-start gap-2">
                  <p>{hint}</p>
                  <ReadAloudButton text={hint} label="Read the hint aloud" />
                </div>
              )}
              {revealed && misconception && (
                <p className="mt-2 text-sm text-ink-muted">
                  Diagnosed pattern: {formatMisconception(misconception)}
                </p>
              )}
            </div>
          )}
          {(revealed || feedback === 'correct') && (
            <button
              type="button"
              onClick={fetchProblem}
              className="tap-target mt-4 w-full rounded-2xl border-4 border-ink bg-white py-3 font-display text-xl font-semibold text-ink active:translate-y-1"
            >
              Next problem
            </button>
          )}
        </div>
      </main>
    </div>
  )
}

export default PracticePage
