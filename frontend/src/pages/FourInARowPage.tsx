import { useCallback, useEffect, useRef, useState } from 'react'
import AppHeader from '../components/AppHeader'
import GameTable from '../components/GameTable'
import HomeButton from '../components/HomeButton'
import MuteToggle from '../components/MuteToggle'
import NextArrow from '../components/NextArrow'
import PlayerToken from '../components/PlayerToken'
import PlayingCard from '../components/PlayingCard'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import RoboAvatar from '../components/RoboAvatar'
import SeatName from '../components/SeatName'
import { postJson } from '../api'
import { getLearnerId } from '../learner'
import { getSessionId } from '../session'
import { playSound } from '../sound'
import { speakWhenAllowed } from '../speech'
import { wobble } from '../wobble'

type Owner = 'mine' | 'robo' | null

type Fact = [number, number]

type VisibleState = {
  level: number
  cells: number[]
  owners: Owner[]
  step: 'tap' | 'pass' | 'robo' | 'over'
  fact: Fact | null
  tapped: number | null
  right_cells: number[] | null
  my_count: number
  robo_count: number
  robo_last: { fact: Fact; cell: number } | null
  winner: 'mine' | 'robo' | 'same' | null
  line: number[] | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

const RESULTS = { mine: 'You win!', robo: 'Robo wins.', same: "Same! It's a tie." }

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/four-in-a-row/rounds?session_id=${getSessionId()}&learner_id=${getLearnerId()}`)
}

function roboSaid(state: VisibleState): string {
  const last = state.robo_last
  return last ? `Robo had ${last.fact[0]} and ${last.fact[1]} and covered ${last.fact[0] + last.fact[1]}.` : ''
}

function resultSaid(state: VisibleState): string {
  if (state.line && state.winner === 'mine') return 'Four in a row! You win!'
  if (state.line && state.winner === 'robo') return 'Robo got four in a row. Robo wins.'
  return `You covered ${state.my_count}. Robo covered ${state.robo_count}. ${RESULTS[state.winner ?? 'same']}`
}

/** What the student hears and reads at each step; `hint` is the latest wrong tap's hint, if any. */
function spokenFor(state: VisibleState, hint: string | null, roboShown: boolean): string {
  if (state.step === 'over') return resultSaid(state)
  const fact = state.fact
  if (state.step === 'tap' && fact) {
    const ask = `You have ${fact[0]} and ${fact[1]}. Tap the space that shows how many in all.`
    return roboShown && state.robo_last ? `${roboSaid(state)} ${ask}` : ask
  }
  if (state.step === 'pass' && fact) {
    const made = `${fact[0]} and ${fact[1]} make ${fact[0] + fact[1]}. Tap Robo's turn.`
    return hint ? `${hint} ${made}` : `Yes! ${made}`
  }
  return ''
}

/**
 * Four in a Row for grades K–1: two cards show an addition fact, and the student taps a space on the 5 × 5 board
 * that shows the sum. A right tap covers it with the student's star; a wrong tap wobbles once, the right spaces are
 * outlined, and the hint is shown and spoken — no red text. Robo's turn shows only when the student taps "Robo's
 * turn". Four in a row across, down or corner to corner wins. Each step's words are spoken once the browser allows
 * it. Nothing animates beyond the wobble.
 */
function FourInARowPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [dealing, setDealing] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [roboShown, setRoboShown] = useState(false)
  const spaceRefs = useRef<Record<number, HTMLButtonElement | null>>({})
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
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't set up the board — try again.</p>
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
        <p className="font-display text-2xl font-bold">Setting up the board...</p>
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

  const tap = (cell: number) => {
    sendMove({ type: 'tap', cell }, (result) => {
      playSound(result.correct ? 'correct' : 'wrong')
      setState(result.visible_state)
      setRoboShown(false)
      setProgress((p) => p && { ...p, correct_in_a_row: result.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0 })
      if (result.correct) {
        setHint(null)
        speakWhenAllowed(spokenFor(result.visible_state, null, false))
        return
      }
      wobble(spaceRefs.current[cell])
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
  const fact = state.fact
  const wrongTap = state.tapped !== null && state.owners[state.tapped] !== 'mine'

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader left={<HomeButton />} right={<MuteToggle />} />

      <main className="flex flex-1 flex-col items-center gap-4 px-4 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <h1 className="font-display text-4xl font-bold">Four in a Row</h1>
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <SeatName name="Robo" message={roboShown && state.robo_last ? roboSaid(state) : undefined} />
            </div>

            <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
              <div role="group" aria-label="Board" className="grid grid-cols-5 gap-2">
                {state.cells.map((cell, index) => {
                  const owner = state.owners[index]
                  const right = wrongTap && (state.right_cells ?? []).includes(index)
                  const inLine = (state.line ?? []).includes(index)
                  const label = `Space ${cell}${owner === 'mine' ? ', yours' : owner === 'robo' ? ", Robo's" : ''}${right ? ', the right answer' : ''}${inLine ? ', in the line' : ''}`
                  return (
                    <button
                      key={index}
                      ref={(element) => {
                        spaceRefs.current[index] = element
                      }}
                      type="button"
                      aria-label={label}
                      onClick={() => tap(index)}
                      disabled={sending || state.step !== 'tap' || owner !== null}
                      className={`tap-target flex w-16 items-center justify-center rounded-xl border-2 font-display text-2xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hundreds ${
                        owner ? 'border-chalk/60 bg-felt-edge' : 'border-felt-edge bg-card text-ink'
                      } ${right || inLine ? 'ring-4 ring-hundreds ring-offset-2 ring-offset-felt' : ''}`}
                    >
                      {owner === 'mine' ? <PlayerToken /> : owner === 'robo' ? <RoboAvatar /> : cell}
                    </button>
                  )
                })}
              </div>

              <div aria-live="polite" className="flex w-full max-w-xs flex-col items-center gap-4 md:w-80">
                {fact && state.step !== 'over' && (
                  <>
                    <div role="group" aria-label={`Your cards: ${fact[0]} and ${fact[1]}`} className="flex items-center gap-3">
                      <SeatName name="You" />
                      <span aria-hidden="true" className="flex items-center gap-2">
                        <PlayingCard digit={fact[0]} />
                        <span className="font-display text-4xl font-bold text-chalk">+</span>
                        <PlayingCard digit={fact[1]} />
                      </span>
                    </div>
                    {state.step === 'tap' && <p className="font-display text-3xl font-bold text-chalk">How many in all?</p>}
                  </>
                )}
                <ReadAloudButton text={spoken} label="Hear it again" />
                {hint && <p className="w-full rounded-2xl border-2 border-felt-edge bg-card p-4 text-xl text-ink">{hint}</p>}
                {state.step === 'pass' && (
                  <button
                    type="button"
                    onClick={roboTurn}
                    disabled={sending}
                    className="tap-target flex items-center gap-3 rounded-2xl bg-hundreds px-8 font-display text-2xl font-bold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-chalk focus-visible:ring-offset-2 focus-visible:ring-offset-felt"
                  >
                    Robo's turn
                    <NextArrow />
                  </button>
                )}
                {state.step === 'over' && (
                  <div
                    role="group"
                    aria-label="Game result"
                    className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 text-ink"
                  >
                    <p className="text-center font-display text-2xl font-bold">{resultSaid(state)}</p>
                    <button
                      type="button"
                      aria-label="Play again"
                      onClick={dealGame}
                      disabled={dealing}
                      className="tap-target flex items-center gap-3 rounded-2xl bg-hundreds px-8 font-display text-2xl font-bold text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-chalk focus-visible:ring-offset-2 focus-visible:ring-offset-felt"
                    >
                      Play again
                      <NextArrow />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </GameTable>

        {moveError && <p className="font-display text-lg font-semibold text-alert-text">Couldn't send that — try again.</p>}
      </main>
    </div>
  )
}

export default FourInARowPage
