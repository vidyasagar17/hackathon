import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AnswerBox from '../components/AnswerBox'
import AppHeader from '../components/AppHeader'
import GameTable from '../components/GameTable'
import HomeButton from '../components/HomeButton'
import Keypad from '../components/Keypad'
import LightbulbIcon from '../components/LightbulbIcon'
import MuteToggle from '../components/MuteToggle'
import PlayingCard from '../components/PlayingCard'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import SeatName from '../components/SeatName'
import { postJson } from '../api'
import { shiftIntoPlaces } from '../answerEntry'
import type { Column } from '../columns'
import { formatMisconception } from '../format'
import { prefersReducedMotion } from '../motion'
import { getSessionId } from '../session'
import { playSound } from '../sound'

type Fact = { operation: 'multiply' | 'divide'; left: number; right: number }

type VisibleState = {
  level: number
  fact: Fact
  answer: number | null
  correct_answer: number | null
  robo_fact: Fact | null
  robo_answer: number | null
  robo_correct_answer: number | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

const ANSWER_PLACES: Column[] = ['tens', 'ones']

/** Every fact's answer is at most 81, so a third digit is ignored rather than pushing the first one out. */
const MAX_DIGITS = 2

const TURNS = 10

/** The win celebration's ring pulse: one run, under decision 1's 1.5 s limit. */
const WIN_PULSE_MS = 1200

const SIGN = { multiply: '×', divide: '÷' } as const

const SPOKEN_SIGN = { multiply: 'times', divide: 'divided by' } as const

/** Shared look of the panel buttons; each tag still writes `tap-target` so `check:tap-targets` can see it. */
const PANEL_BUTTON = 'rounded-2xl px-6 font-display text-xl font-semibold'

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/multiplication-shootout/rounds?session_id=${getSessionId()}`)
}

function spokenFact(fact: Fact) {
  return `${fact.left} ${SPOKEN_SIGN[fact.operation]} ${fact.right}`
}

function writtenFact(fact: Fact) {
  return `${fact.left} ${SIGN[fact.operation]} ${fact.right}`
}

function outcome(myPoints: number, roboPoints: number) {
  if (myPoints > roboPoints) return 'You win this duel!'
  if (myPoints < roboPoints) return 'Robo wins this duel.'
  return "It's a draw!"
}

/** True while any animation on the page is still playing, so a celebration never overlaps it. */
function animationRunning() {
  return document.getAnimations?.().some((animation) => animation.playState === 'running') ?? false
}

/** A number as one playing card per digit. */
function NumberCards({ value }: { value: number }) {
  return (
    <span className="flex gap-2">
      {String(value)
        .split('')
        .map((digit, index) => (
          <PlayingCard key={index} digit={digit} />
        ))}
    </span>
  )
}

/** A fact laid out as cards with a large sign between them. */
function FactCards({ fact }: { fact: Fact }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-3">
      <NumberCards value={fact.left} />
      <span className="px-1 font-display text-5xl font-bold text-chalk">{SIGN[fact.operation]}</span>
      <NumberCards value={fact.right} />
    </span>
  )
}

/** Robo's seat and the fact it calls for the student. */
function CalledFact({ fact }: { fact: Fact }) {
  return (
    <div
      role="group"
      aria-label={`Robo calls ${spokenFact(fact)}`}
      className="flex flex-wrap items-center justify-center gap-4"
    >
      <SeatName name="Robo" />
      <FactCards fact={fact} />
    </div>
  )
}

/** Robo's own fact and answer in the same row as the called fact, so the table doesn't grow; a wrong answer always shows the right one. */
function RoboTurn({ fact, answer, correctAnswer }: { fact: Fact; answer: number; correctAnswer: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <div role="group" aria-label={`Robo's fact: ${spokenFact(fact)}`} className="flex items-center gap-4">
        <SeatName name="Robo" />
        <FactCards fact={fact} />
      </div>
      <p className="font-display text-xl font-semibold text-chalk">
        {answer === correctAnswer
          ? `Robo said ${answer} — correct!`
          : `Robo said ${answer} — ${writtenFact(fact)} is ${correctAnswer}.`}
      </p>
    </div>
  )
}

/**
 * The end of a duel: both totals, who won, and Play again. A win pulses a ring around the card once
 * (decision 1's feedback cue), triggered by the student's "See who won" press; nothing plays under
 * reduced motion or while another animation is still running. A loss or a draw only shows the totals.
 */
function DuelResult({
  myPoints,
  roboPoints,
  onPlayAgain,
}: {
  myPoints: number
  roboPoints: number
  onPlayAgain: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const celebrated = useRef(false)
  const won = myPoints > roboPoints

  useEffect(() => {
    if (!won || celebrated.current || prefersReducedMotion() || animationRunning()) return
    celebrated.current = true
    cardRef.current?.animate(
      [{ boxShadow: '0 0 0 0 rgba(61, 220, 151, 0.8)' }, { boxShadow: '0 0 0 18px rgba(61, 220, 151, 0)' }],
      { duration: WIN_PULSE_MS, easing: 'ease-out' },
    )
  }, [won])

  return (
    <div
      ref={cardRef}
      role="group"
      aria-label="Duel result"
      aria-live="polite"
      className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-2 border-felt-edge bg-card p-6"
    >
      <p className="font-display text-2xl font-semibold">{`You ${myPoints} · Robo ${roboPoints}`}</p>
      <p className="font-display text-3xl font-bold">{outcome(myPoints, roboPoints)}</p>
      <button type="button" onClick={onPlayAgain} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
        Play again
      </button>
    </div>
  )
}

/**
 * Multiplication Shootout on the game table: a duel of ten turns. Each turn Robo calls a fact and the
 * student answers it on the keypad, digits filling left to right like a calculator. After the answer
 * is checked, the verdict and, on request, the hint with its diagnosed pattern sit in a panel beside
 * the answer. Robo's own turn appears only when the student presses "Robo's turn", and the result only
 * when they press "See who won", so one new thing shows at a time. The page keeps the score; a point
 * counts for the student at Check and for Robo once its turn is shown.
 */
function MultiplicationShootoutPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<MoveResult | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintError, setHintError] = useState(false)
  const [roboShown, setRoboShown] = useState(false)
  const [turn, setTurn] = useState(1)
  const [myPoints, setMyPoints] = useState(0)
  const [roboPoints, setRoboPoints] = useState(0)
  const [finished, setFinished] = useState(false)
  const hintRequest = useRef<AbortController | null>(null)

  const showRound = useCallback((payload: RoundPayload) => {
    hintRequest.current?.abort()
    setRoundId(payload.round_id)
    setState(payload.visible_state)
    setProgress(payload.progress)
    setLoadError(false)
    setMoveError(false)
    setTyped('')
    setResult(null)
    setHint(null)
    setHintError(false)
    setRoboShown(false)
  }, [])

  useEffect(() => {
    let stale = false
    requestRound()
      .then((payload) => {
        if (!stale) showRound(payload)
      })
      .catch(() => {
        if (!stale) setLoadError(true)
      })
    return () => {
      stale = true
    }
  }, [showRound])

  const dealTurn = () => {
    requestRound()
      .then(showRound)
      .catch(() => setLoadError(true))
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col bg-base">
        <AppHeader left={<HomeButton />} right={<MuteToggle />} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't deal a turn — try again.</p>
          <button
            type="button"
            onClick={dealTurn}
            className="tap-target rounded-2xl bg-ink px-6 font-display font-semibold text-base"
          >
            Retry
          </button>
        </main>
      </div>
    )
  }

  if (!state || !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <p className="font-display text-2xl font-bold">Dealing a fact...</p>
      </div>
    )
  }

  const answering = result === null
  const answerReady = typed !== '' && answering && !sending
  const shown = shiftIntoPlaces(ANSWER_PLACES, typed)
  const roboTurn =
    roboShown && state.robo_fact && state.robo_answer !== null && state.robo_correct_answer !== null
      ? { fact: state.robo_fact, answer: state.robo_answer, correctAnswer: state.robo_correct_answer }
      : null

  const pressDigit = (digit: string) => {
    playSound('tap')
    setTyped((current) => (current.length < MAX_DIGITS ? current + digit : current))
  }

  const pressDelete = () => {
    playSound('tap')
    setTyped((current) => current.slice(0, -1))
  }

  const checkAnswer = () => {
    setSending(true)
    setMoveError(false)
    postJson<MoveResult>(`/rounds/${roundId}/moves`, { move: { answer: Number(typed) } })
      .then((moveResult) => {
        playSound(moveResult.correct ? 'correct' : 'wrong')
        setResult(moveResult)
        setState(moveResult.visible_state)
        if (moveResult.correct) setMyPoints((points) => points + 1)
        setProgress(
          (p) =>
            p && {
              ...p,
              correct_in_a_row: moveResult.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0,
            },
        )
      })
      .catch(() => setMoveError(true))
      .finally(() => setSending(false))
  }

  const showWhy = () => {
    hintRequest.current?.abort()
    const request = new AbortController()
    hintRequest.current = request
    setHintError(false)
    postJson<{ hint: string | null }>(`/rounds/${roundId}/hint`, undefined, request.signal)
      .then((reply) => setHint(reply.hint))
      .catch(() => {
        if (!request.signal.aborted) setHintError(true)
      })
  }

  const showRoboTurn = () => {
    if (state.robo_answer !== null && state.robo_answer === state.robo_correct_answer) {
      setRoboPoints((points) => points + 1)
    }
    setRoboShown(true)
  }

  const nextTurn = () => {
    setTurn((current) => current + 1)
    dealTurn()
  }

  const playAgain = () => {
    setTurn(1)
    setMyPoints(0)
    setRoboPoints(0)
    setFinished(false)
    dealTurn()
  }

  const spoken = finished
    ? `You ${myPoints}, Robo ${roboPoints}. ${outcome(myPoints, roboPoints)}`
    : roboTurn
      ? roboTurn.answer === roboTurn.correctAnswer
        ? `Robo's fact is ${spokenFact(roboTurn.fact)}. Robo said ${roboTurn.answer}, which is correct.`
        : `Robo's fact is ${spokenFact(roboTurn.fact)}. Robo said ${roboTurn.answer}, but it is ${roboTurn.correctAnswer}.`
      : answering
        ? `Turn ${turn} of ${TURNS}. Robo calls ${spokenFact(state.fact)}. Type your answer.`
        : result.correct
          ? `Correct! ${spokenFact(state.fact)} is ${state.correct_answer}.`
          : `Not quite. ${spokenFact(state.fact)} is ${state.correct_answer}.`

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

      <main className="flex flex-1 flex-col items-center gap-4 px-4 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <h1 className="font-display text-4xl font-bold">Multiplication Shootout</h1>
          <ReadAloudButton text={spoken} label="Read the instructions aloud" />
        </div>

        <ProgressMeter progress={progress} canCelebrate />

        <GameTable>
          {finished ? (
            <DuelResult myPoints={myPoints} roboPoints={roboPoints} onPlayAgain={playAgain} />
          ) : (
            <div className="flex flex-col items-center gap-6">
              <p className="font-display text-xl font-semibold text-chalk">
                {`Turn ${turn} of ${TURNS} · You ${myPoints} · Robo ${roboPoints}`}
              </p>
              {roboTurn ? <RoboTurn {...roboTurn} /> : <CalledFact fact={state.fact} />}
              <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-center md:justify-center">
                <div className="flex items-center gap-4">
                  <SeatName name="You" />
                  <div
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && answerReady) checkAnswer()
                    }}
                    className="flex gap-2 rounded-2xl border-2 border-felt-edge bg-card p-2"
                  >
                    {ANSWER_PLACES.map((place) => (
                      <AnswerBox
                        key={place}
                        column={place}
                        value={shown[place]}
                        onChange={(value) => (value ? pressDigit(value) : pressDelete())}
                        active={false}
                        onSelect={() => {}}
                        usesKeypad
                        disabled={!answering}
                      />
                    ))}
                  </div>
                </div>
                {answering && (
                  <Keypad
                    onDigit={pressDigit}
                    onDelete={pressDelete}
                    onCheck={checkAnswer}
                    checkDisabled={!answerReady}
                  />
                )}
                {!answering && (
                  <div
                    aria-live="polite"
                    className="flex w-full max-w-xs flex-col items-start gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 md:w-80"
                  >
                    <p
                      className={`font-display text-2xl font-bold ${result.correct ? 'text-success-text' : 'text-alert-text'}`}
                    >
                      {result.correct
                        ? 'Correct!'
                        : `Not quite — ${writtenFact(state.fact)} is ${state.correct_answer}.`}
                    </p>
                    {!result.correct && hint === null && (
                      <button
                        type="button"
                        onClick={showWhy}
                        className={`tap-target ${PANEL_BUTTON} inline-flex items-center gap-2 border-4 border-ink bg-white text-ink`}
                      >
                        <LightbulbIcon />
                        Show me why
                      </button>
                    )}
                    {hintError && (
                      <p className="font-semibold text-alert-text">Couldn't load the hint — try again.</p>
                    )}
                    {hint && (
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-lg">{hint}</p>
                        <ReadAloudButton text={hint} label="Read the hint aloud" />
                        {result.misconception && (
                          <p className="text-sm text-ink-muted">
                            Diagnosed pattern: {formatMisconception(result.misconception)}
                          </p>
                        )}
                      </div>
                    )}
                    {!roboTurn && (
                      <button
                        type="button"
                        onClick={showRoboTurn}
                        className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}
                      >
                        Robo's turn
                      </button>
                    )}
                    {roboTurn && turn < TURNS && (
                      <button
                        type="button"
                        onClick={nextTurn}
                        className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}
                      >
                        Next turn
                      </button>
                    )}
                    {roboTurn && turn === TURNS && (
                      <button
                        type="button"
                        onClick={() => setFinished(true)}
                        className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}
                      >
                        See who won
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </GameTable>

        {moveError && (
          <p className="font-display text-lg font-semibold text-alert-text">Couldn't send your answer — try again.</p>
        )}
      </main>
    </div>
  )
}

export default MultiplicationShootoutPage
