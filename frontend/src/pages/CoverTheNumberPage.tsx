import { useCallback, useEffect, useRef, useState } from 'react'
import AppHeader from '../components/AppHeader'
import DiceFace from '../components/DiceFace'
import DotCard from '../components/DotCard'
import GameTable from '../components/GameTable'
import HomeButton from '../components/HomeButton'
import MuteToggle from '../components/MuteToggle'
import NextArrow from '../components/NextArrow'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import SeatName from '../components/SeatName'
import { postJson } from '../api'
import { getSessionId } from '../session'
import { playSound } from '../sound'
import { speakWhenAllowed } from '../speech'
import { wobble } from '../wobble'

type Roll = { values: number[]; dots: [number, number][] | null }

type VisibleState = {
  level: number
  board: number[]
  turn: number
  turns: number
  step: 'roll' | 'tap' | 'roll_again' | 'pass' | 'robo' | 'over'
  my_covered: number[]
  robo_covered: number[]
  my_roll: Roll | null
  tapped: number | null
  result: 'covered' | 'already' | 'wrong' | null
  right: number | null
  robo_last: { rolls: Roll[]; covered: number | null } | null
  winner: 'mine' | 'robo' | 'same' | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

const RESULTS = { mine: 'You win!', robo: 'Robo wins.', same: "Same! It's a tie." }

const BIG_BUTTON = 'flex items-center gap-3 rounded-2xl bg-hundreds px-8 font-display text-2xl font-bold text-ink'

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/cover-the-number/rounds?session_id=${getSessionId()}`)
}

const rollTotal = (roll: Roll) => roll.values.reduce((sum, value) => sum + value, 0)

function roboSaid(state: VisibleState): string {
  const last = state.robo_last
  if (!last) return ''
  const rolled = `Robo rolled ${last.rolls.map(rollTotal).join(', then ')}`
  return last.covered === null
    ? `${rolled}. ${rollTotal(last.rolls[last.rolls.length - 1])} is already covered.`
    : `${rolled} and covered ${last.covered}.`
}

function resultSaid(state: VisibleState): string {
  return `You covered ${state.my_covered.length}. Robo covered ${state.robo_covered.length}. ${RESULTS[state.winner ?? 'same']}`
}

/** What the student hears and reads at each step; `hint` is the latest wrong tap's hint, if any. */
function spokenFor(state: VisibleState, hint: string | null, roboShown: boolean): string {
  if (state.step === 'over') return resultSaid(state)
  if (state.step === 'roll') return roboShown && state.robo_last ? `${roboSaid(state)} Tap Roll.` : 'Tap Roll.'
  if (state.step === 'tap') return state.level === 3 ? 'Tap how many dots in all.' : 'Tap the number of dots.'
  const next = state.step === 'roll_again' ? 'Tap Roll again.' : "Tap Robo's turn."
  if (state.result === 'wrong') return `${hint ?? `That's ${state.right}.`} ${next}`
  if (state.result === 'already') return `Yes, ${state.right}! ${state.right} is already covered. ${next}`
  return `Yes, ${state.right}! You covered ${state.right}. ${next}`
}

/** A roll as the table shows it: one die, a scattered dot card, or two dice. */
function RollFace({ roll, size = 'large' }: { roll: Roll; size?: 'large' | 'small' }) {
  if (roll.dots) return <DotCard dots={roll.dots} size={size} />
  return (
    <span className="flex gap-2">
      {roll.values.map((value, index) => (
        <DiceFace key={index} value={value} size={size} />
      ))}
    </span>
  )
}

/**
 * Cover the Number for grades K–1: roll, count the dots, and tap that number on your board to cover it. Level 1 rolls
 * one die, level 2 shows a card of scattered dots, level 3 rolls two dice. A wrong tap wobbles once, the right number
 * is outlined, and the counting hint is shown and spoken — no red text. A right tap on a number already covered lets
 * the student roll again once. Robo's turn shows only when the student taps "Robo's turn". Each step's words are
 * spoken once the browser allows it. Nothing animates beyond the wobble.
 */
function CoverTheNumberPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [dealing, setDealing] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [roboShown, setRoboShown] = useState(false)
  const numberRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const hintRequest = useRef<AbortController | null>(null)

  const showRound = useCallback((payload: RoundPayload) => {
    hintRequest.current?.abort()
    setRoundId(payload.round_id)
    setState(payload.visible_state)
    setProgress(payload.progress)
    setLoadError(false)
    setMoveError(false)
    setHint(null)
    setRoboShown(false)
    speakWhenAllowed(spokenFor(payload.visible_state, null, false))
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

  /** Deal a new game; Play again stays off until it arrives, so a double tap deals once. */
  const dealGame = () => {
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
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't set up the boards — try again.</p>
          <button type="button" onClick={dealGame} className="tap-target rounded-2xl bg-ink px-6 font-display font-semibold text-base">
            Retry
          </button>
        </main>
      </div>
    )
  }

  if (!state || !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <p className="font-display text-2xl font-bold">Setting up the boards...</p>
      </div>
    )
  }

  const sendMove = (move: object, onDone: (result: MoveResult) => void) => {
    setSending(true)
    setMoveError(false)
    postJson<MoveResult>(`/rounds/${roundId}/moves`, { move })
      .then(onDone)
      .catch(() => setMoveError(true))
      .finally(() => setSending(false))
  }

  /** Roll or Roll again: not graded; clears the last hint and Robo's line. */
  const roll = (type: 'roll' | 'roll_again') => {
    playSound('tap')
    sendMove({ type }, (result) => {
      hintRequest.current?.abort()
      setHint(null)
      setRoboShown(false)
      setState(result.visible_state)
      speakWhenAllowed(spokenFor(result.visible_state, null, false))
    })
  }

  const tap = (number: number) => {
    sendMove({ type: 'tap', number }, (result) => {
      playSound(result.correct ? 'correct' : 'wrong')
      setState(result.visible_state)
      setProgress((p) => p && { ...p, correct_in_a_row: result.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0 })
      if (result.correct) {
        setHint(null)
        speakWhenAllowed(spokenFor(result.visible_state, null, false))
        return
      }
      wobble(numberRefs.current[number])
      hintRequest.current?.abort()
      const request = new AbortController()
      hintRequest.current = request
      postJson<{ hint: string | null }>(`/rounds/${roundId}/hint`, undefined, request.signal)
        .then((reply) => {
          setHint(reply.hint)
          speakWhenAllowed(spokenFor(result.visible_state, reply.hint, false))
        })
        .catch(() => {
          if (!request.signal.aborted) speakWhenAllowed(spokenFor(result.visible_state, null, false))
        })
    })
  }

  const roboTurn = () => {
    playSound('tap')
    sendMove({ type: 'robo_turn' }, (result) => {
      hintRequest.current?.abort()
      setHint(null)
      setRoboShown(true)
      setState(result.visible_state)
      speakWhenAllowed(spokenFor(result.visible_state, null, true))
    })
  }

  const spoken = spokenFor(state, hint, roboShown)
  const wrong = state.result === 'wrong'
  const question = state.step === 'tap' ? (state.level === 3 ? 'How many dots in all?' : 'How many dots?') : null

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader left={<HomeButton />} right={<MuteToggle />} />

      <main className="flex flex-1 flex-col items-center gap-4 px-4 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <h1 className="font-display text-4xl font-bold">Cover the Number</h1>
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <SeatName name="Robo" />
              <div
                role="img"
                aria-label={`Robo's board: ${state.robo_covered.length} of ${state.board.length} covered`}
                className="flex flex-wrap justify-center gap-1"
              >
                {state.board.map((value) => (
                  <span
                    key={value}
                    aria-hidden="true"
                    className={`flex h-10 w-8 items-center justify-center rounded-md border-2 font-display text-lg font-bold ${
                      state.robo_covered.includes(value) ? 'border-chalk/40 bg-felt-edge text-chalk' : 'border-felt-edge bg-card text-ink'
                    }`}
                  >
                    {value}
                  </span>
                ))}
              </div>
              {roboShown && state.robo_last && (
                <div className="flex items-center gap-2">
                  <RollFace roll={state.robo_last.rolls[state.robo_last.rolls.length - 1]} size="small" />
                  <p className="font-display text-xl font-semibold text-chalk">{roboSaid(state)}</p>
                </div>
              )}
            </div>

            <p className="font-display text-xl font-semibold text-chalk">{`Turn ${state.turn} of ${state.turns}`}</p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <SeatName name="You" />
              {state.my_roll && state.step !== 'roll' && <RollFace roll={state.my_roll} />}
              {state.step === 'roll' && (
                <button type="button" onClick={() => roll('roll')} disabled={sending} className={`tap-target ${BIG_BUTTON}`}>
                  Roll
                </button>
              )}
              {question && <p className="font-display text-3xl font-bold text-chalk">{question}</p>}
              <ReadAloudButton text={spoken} label="Hear it again" />
            </div>

            <div aria-live="polite" className="flex w-full max-w-2xl flex-col items-center gap-3">
              {hint && <p className="w-full rounded-2xl border-2 border-felt-edge bg-card p-4 text-xl text-ink">{hint}</p>}
              {state.result === 'already' && (
                <p className="font-display text-2xl font-semibold text-chalk">{`${state.right} is already covered.`}</p>
              )}
            </div>

            <div role="group" aria-label="Your board" className="flex max-w-2xl flex-wrap justify-center gap-2">
              {state.board.map((value) => {
                const covered = state.my_covered.includes(value)
                const right = wrong && state.right === value
                const label = `Number ${value}${covered ? ', covered' : ''}${right ? ', the right answer' : ''}`
                return (
                  <button
                    key={value}
                    ref={(element) => {
                      numberRefs.current[value] = element
                    }}
                    type="button"
                    aria-label={label}
                    onClick={() => tap(value)}
                    disabled={sending || state.step !== 'tap'}
                    className={`tap-target w-16 rounded-xl border-4 font-display text-3xl font-bold ${
                      covered ? 'border-chalk/40 bg-felt-edge text-chalk' : 'border-felt-edge bg-card text-ink'
                    } ${right ? 'ring-8 ring-hundreds' : ''}`}
                  >
                    {value}
                  </button>
                )
              })}
            </div>

            {state.step === 'roll_again' && (
              <button type="button" onClick={() => roll('roll_again')} disabled={sending} className={`tap-target ${BIG_BUTTON}`}>
                Roll again
                <NextArrow />
              </button>
            )}
            {state.step === 'pass' && (
              <button type="button" onClick={roboTurn} disabled={sending} className={`tap-target ${BIG_BUTTON}`}>
                Robo's turn
                <NextArrow />
              </button>
            )}
            {state.step === 'over' && (
              <div
                role="group"
                aria-label="Game result"
                className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 text-ink"
              >
                <p className="text-center font-display text-2xl font-bold">{resultSaid(state)}</p>
                <button type="button" aria-label="Play again" onClick={dealGame} disabled={dealing} className={`tap-target ${BIG_BUTTON} disabled:opacity-40`}>
                  Play again
                  <NextArrow />
                </button>
              </div>
            )}
          </div>
        </GameTable>

        {moveError && <p className="font-display text-lg font-semibold text-alert-text">Couldn't send that — try again.</p>}
      </main>
    </div>
  )
}

export default CoverTheNumberPage
