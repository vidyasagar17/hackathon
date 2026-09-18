import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AnswerBox from '../components/AnswerBox'
import AppHeader from '../components/AppHeader'
import DuelResult from '../components/DuelResult'
import DuelScoreLine from '../components/DuelScoreLine'
import DuelTurnButtons from '../components/DuelTurnButtons'
import GameTable from '../components/GameTable'
import HintPanel from '../components/HintPanel'
import HomeButton from '../components/HomeButton'
import Keypad from '../components/Keypad'
import MuteToggle from '../components/MuteToggle'
import PlayingCard from '../components/PlayingCard'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import SeatName from '../components/SeatName'
import Verdict from '../components/Verdict'
import { postJson } from '../api'
import { shiftIntoPlaces } from '../answerEntry'
import type { Column } from '../columns'
import { duelOutcome } from '../duel'
import { useRoundHint } from '../roundHint'
import { getLearnerId } from '../learner'
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

const SIGN = { multiply: '×', divide: '÷' } as const

const SPOKEN_SIGN = { multiply: 'times', divide: 'divided by' } as const

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/multiplication-shootout/rounds?session_id=${getSessionId()}&learner_id=${getLearnerId()}`)
}

function spokenFact(fact: Fact) {
  return `${fact.left} ${SPOKEN_SIGN[fact.operation]} ${fact.right}`
}

function writtenFact(fact: Fact) {
  return `${fact.left} ${SIGN[fact.operation]} ${fact.right}`
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
      <SeatName name="Robo" message={`Your turn! What is ${writtenFact(fact)}?`} />
      <FactCards fact={fact} />
    </div>
  )
}

/** Robo's own fact and answer in the same row as the called fact, so the table doesn't grow; a wrong answer always shows the right one. */
function RoboTurn({ fact, answer, correctAnswer }: { fact: Fact; answer: number; correctAnswer: number }) {
  const message =
    answer === correctAnswer
      ? `I think it's ${answer} — correct!`
      : `I said ${answer} — ${writtenFact(fact)} is ${correctAnswer}.`

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <div role="group" aria-label={`Robo's fact: ${spokenFact(fact)}`} className="flex items-center gap-4">
        <SeatName name="Robo" message={message} />
        <FactCards fact={fact} />
      </div>
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
  const [dealing, setDealing] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<MoveResult | null>(null)
  const [roboShown, setRoboShown] = useState(false)
  const [turn, setTurn] = useState(1)
  const [myPoints, setMyPoints] = useState(0)
  const [roboPoints, setRoboPoints] = useState(0)
  const [finished, setFinished] = useState(false)
  const { hint, hintError, showWhy, clearHint } = useRoundHint()

  const showRound = useCallback((payload: RoundPayload) => {
    setRoundId(payload.round_id)
    setState(payload.visible_state)
    setProgress(payload.progress)
    setLoadError(false)
    setMoveError(false)
    setTyped('')
    setResult(null)
    clearHint()
    setRoboShown(false)
  }, [clearHint])

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

  /** Deal the next fact; Next turn stays off until it arrives, so a double tap deals once. */
  const dealTurn = () => {
    setDealing(true)
    requestRound()
      .then(showRound)
      .catch(() => setLoadError(true))
      .finally(() => setDealing(false))
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
    ? `You ${myPoints}, Robo ${roboPoints}. ${duelOutcome(myPoints, roboPoints, 'duel')}`
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
            <DuelResult
              myPoints={myPoints}
              roboPoints={roboPoints}
              noun="duel"
              card
              celebrate
              dealing={dealing}
              onPlayAgain={playAgain}
            />
          ) : (
            <div className="flex flex-col items-center gap-6">
              <DuelScoreLine unit="Turn" at={turn} of={TURNS} myPoints={myPoints} roboPoints={roboPoints} />
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
                    <Verdict correct={result.correct}>
                      {result.correct
                        ? 'Correct!'
                        : `Not quite — ${writtenFact(state.fact)} is ${state.correct_answer}.`}
                    </Verdict>
                    <HintPanel
                      wrong={!result.correct}
                      hint={hint}
                      hintError={hintError}
                      misconception={result.misconception}
                      onShowWhy={() => showWhy(roundId)}
                    />
                    <DuelTurnButtons
                      roboDue={!roboTurn}
                      turnDone={Boolean(roboTurn)}
                      lastTurn={turn === TURNS}
                      finished={finished}
                      nextLabel="Next turn"
                      dealing={dealing}
                      onRoboTurn={showRoboTurn}
                      onNext={nextTurn}
                      onSeeWhoWon={() => setFinished(true)}
                    />
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
