import { useCallback, useEffect, useRef, useState } from 'react'
import AppHeader from '../components/AppHeader'
import DiceFace from '../components/DiceFace'
import GameTable from '../components/GameTable'
import HomeButton from '../components/HomeButton'
import MuteToggle from '../components/MuteToggle'
import NextArrow from '../components/NextArrow'
import PlayingCard from '../components/PlayingCard'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import SeatName from '../components/SeatName'
import { postJson } from '../api'
import { getSessionId } from '../session'
import { playSound } from '../sound'
import { speakWhenAllowed } from '../speech'
import { wobble } from '../wobble'

type Step = 'roll' | 'total' | 'shut' | 'pass' | 'robo' | 'over'

type Dice = [number, number]

type VisibleState = {
  level: number
  faces: number
  tiles: number
  step: Step
  my_open: number[]
  robo_open: number[]
  my_dice: Dice | null
  choices: number[] | null
  total_pick: number | null
  my_total: number | null
  can_shut: boolean | null
  picked_tiles: number[] | null
  shut_tiles: number[] | null
  my_done: boolean
  robo_done: boolean
  robo_last: { dice: Dice; shut: number[] | null } | null
  winner: 'mine' | 'robo' | 'same' | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

const RESULTS = { mine: 'You win!', robo: 'Robo wins.', same: "Same! It's a tie." }

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/shut-the-box/rounds?session_id=${getSessionId()}`)
}

/** 5; 5 and 3; 1, 2 and 5 */
function joined(numbers: number[]): string {
  return numbers.length === 1 ? String(numbers[0]) : `${numbers.slice(0, -1).join(', ')} and ${numbers.at(-1)}`
}

function tilesOpen(count: number): string {
  return `${count} ${count === 1 ? 'tile' : 'tiles'} open`
}

function roboSaid(state: VisibleState): string {
  const last = state.robo_last
  if (!last) return ''
  const rolled = `Robo rolled ${last.dice[0]} and ${last.dice[1]}`
  return last.shut
    ? `${rolled} and shut ${joined(last.shut)}.`
    : `${rolled}. No tiles make ${last.dice[0] + last.dice[1]}. Robo's box is done.`
}

function resultSpoken(state: VisibleState): string {
  return `You have ${tilesOpen(state.my_open.length)}. Robo has ${tilesOpen(state.robo_open.length)}. ${RESULTS[state.winner ?? 'same']}`
}

/** What the student hears and reads at each step; `hint` is the latest wrong move's hint, if any. */
function spokenFor(state: VisibleState, hint: string | null, roboShown: boolean): string {
  const withHint = (text: string) => (hint ? `${hint} ${text}` : text)
  if (state.step === 'over') return resultSpoken(state)
  if (state.step === 'roll') return roboShown && state.robo_last ? `${roboSaid(state)} Tap Roll.` : 'Tap Roll.'
  if (state.step === 'total' && state.my_dice) {
    return `You rolled ${state.my_dice[0]} and ${state.my_dice[1]}. Tap how many dots in all.`
  }
  if (state.step === 'shut') return withHint(`Tap tiles that make ${state.my_total}, then tap Shut.`)
  if (state.my_done && state.picked_tiles === null) {
    return withHint(`No tiles make ${state.my_total}. Your box is done. Tap Robo's turn.`)
  }
  if (roboShown && state.robo_last) return `${roboSaid(state)} Tap Robo's turn.`
  const shut = state.shut_tiles ?? []
  const picked = state.picked_tiles ?? []
  const shown = shut.join() === picked.join() ? `You shut ${joined(shut)}.` : `Here is a way: ${joined(shut)}.`
  return withHint(`${shown} Tap Robo's turn.`)
}

/** Robo's seat, its box as small tiles, and what it did on its latest turn once shown. */
function RoboBox({ state, roboShown }: { state: VisibleState; roboShown: boolean }) {
  const tiles = Array.from({ length: state.tiles }, (_, index) => index + 1)
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <SeatName name="Robo" />
      <div
        role="img"
        aria-label={`Robo's box: ${tilesOpen(state.robo_open.length)}`}
        className="flex flex-wrap justify-center gap-1"
      >
        {tiles.map((tile) => (
          <span
            key={tile}
            aria-hidden="true"
            className={`flex h-10 w-8 items-center justify-center rounded-md border-2 font-display text-lg font-bold ${state.robo_open.includes(tile) ? 'border-felt-edge bg-card text-ink' : 'border-chalk/40 bg-felt-edge text-chalk'}`}
          >
            {tile}
          </span>
        ))}
      </div>
      {roboShown && state.robo_last && (
        <div className="flex items-center gap-2">
          <DiceFace value={state.robo_last.dice[0]} size="small" />
          <DiceFace value={state.robo_last.dice[1]} size="small" />
          <p className="font-display text-xl font-semibold text-chalk">{roboSaid(state)}</p>
        </div>
      )}
    </div>
  )
}

/**
 * Shut the Box for grades K–1: roll, tap how many dots in all, then tap tiles that make that many and Shut.
 * Each step's words are spoken once the browser allows it; a wrong tap wobbles once, the right card is
 * outlined or a right way is shut, and the counting hint is shown and spoken — no red text. Robo's turn
 * shows only when the student taps "Robo's turn". Fewest open tiles wins. No roll or flip animation.
 */
function ShutTheBoxPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [hint, setHint] = useState<string | null>(null)
  const [roboShown, setRoboShown] = useState(false)
  const cardRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const tileRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const hintRequest = useRef<AbortController | null>(null)

  const showRound = useCallback((payload: RoundPayload) => {
    hintRequest.current?.abort()
    setRoundId(payload.round_id)
    setState(payload.visible_state)
    setProgress(payload.progress)
    setLoadError(false)
    setMoveError(false)
    setSelected([])
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

  const dealGame = () => {
    requestRound()
      .then(showRound)
      .catch(() => setLoadError(true))
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col bg-base">
        <AppHeader left={<HomeButton />} right={<MuteToggle />} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't set up the box — try again.</p>
          <button
            type="button"
            onClick={dealGame}
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
        <p className="font-display text-2xl font-bold">Setting up the box...</p>
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

  /** After a graded move: sound, stars, and on a wrong one a wobble and the hint, shown and spoken with the next step. */
  const afterGraded = (result: MoveResult, wrongElements: (HTMLElement | null | undefined)[]) => {
    playSound(result.correct ? 'correct' : 'wrong')
    setState(result.visible_state)
    setProgress(
      (p) => p && { ...p, correct_in_a_row: result.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0 },
    )
    if (result.correct) {
      setHint(null)
      speakWhenAllowed(spokenFor(result.visible_state, null, false))
      return
    }
    wrongElements.forEach(wobble)
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
  }

  const roll = () => {
    playSound('tap')
    sendMove({ type: 'roll' }, (result) => {
      hintRequest.current?.abort()
      setHint(null)
      setRoboShown(false)
      setSelected([])
      setState(result.visible_state)
      speakWhenAllowed(spokenFor(result.visible_state, null, false))
    })
  }

  const pickTotal = (pick: number) => {
    sendMove({ type: 'total', pick }, (result) => afterGraded(result, [cardRefs.current[pick]]))
  }

  const toggleTile = (tile: number) => {
    playSound('tap')
    setSelected((current) => (current.includes(tile) ? current.filter((each) => each !== tile) : [...current, tile]))
  }

  const shut = () => {
    const tiles = selected
    sendMove({ type: 'shut', tiles }, (result) => {
      setSelected([])
      afterGraded(
        result,
        tiles.map((tile) => tileRefs.current[tile]),
      )
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

  const tiles = Array.from({ length: state.tiles }, (_, index) => index + 1)
  const spoken = spokenFor(state, hint, roboShown)
  const question =
    state.step === 'total'
      ? 'How many dots in all?'
      : state.step === 'shut'
        ? `Tap tiles that make ${state.my_total}`
        : state.my_total !== null && state.step !== 'roll' && state.step !== 'over'
          ? `You rolled ${state.my_total}`
          : null
  const boxDone = state.my_done && state.picked_tiles === null && state.step !== 'roll'
  const wrongTotal = state.total_pick !== null && state.total_pick !== state.my_total
  const showCards = state.choices !== null && (state.step === 'total' || ((state.step === 'shut' || boxDone) && wrongTotal))
  const shutMessage =
    state.step === 'pass' && !boxDone && state.shut_tiles && !roboShown
      ? state.shut_tiles.join() === (state.picked_tiles ?? []).join()
        ? `You shut ${joined(state.shut_tiles)}.`
        : `Here is a way: ${joined(state.shut_tiles)}.`
      : null

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader left={<HomeButton />} right={<MuteToggle />} />

      <main className="flex flex-1 flex-col items-center gap-4 px-4 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <h1 className="font-display text-4xl font-bold">Shut the Box</h1>
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          <div className="flex flex-col items-center gap-4">
            <RoboBox state={state} roboShown={roboShown} />

            <div className="flex flex-wrap items-center justify-center gap-4">
              <SeatName name="You" />
              {state.my_dice && state.step !== 'roll' && (
                <div role="group" aria-label="Your dice" className="flex gap-3">
                  <DiceFace value={state.my_dice[0]} />
                  <DiceFace value={state.my_dice[1]} />
                </div>
              )}
              {state.step === 'roll' && (
                <button
                  type="button"
                  onClick={roll}
                  disabled={sending}
                  className="tap-target rounded-2xl bg-hundreds px-10 font-display text-2xl font-bold text-ink"
                >
                  Roll
                </button>
              )}
              {question && <p className="font-display text-3xl font-bold text-chalk">{question}</p>}
              <ReadAloudButton text={spoken} label="Hear it again" />
            </div>

            <div aria-live="polite" className="flex w-full max-w-2xl flex-col items-center gap-3">
              {hint && <p className="w-full rounded-2xl border-2 border-felt-edge bg-card p-4 text-xl text-ink">{hint}</p>}
              {boxDone && (
                <p className="w-full rounded-2xl border-2 border-felt-edge bg-card p-4 text-xl text-ink">
                  {`No tiles make ${state.my_total}. Your box is done.`}
                </p>
              )}
            </div>

            {showCards && state.choices && (
              <div role="group" aria-label="Answer cards" className="flex flex-wrap justify-center gap-4">
                {state.choices.map((choice) => {
                  const right = state.total_pick !== null && state.my_total === choice
                  return (
                    <button
                      key={choice}
                      ref={(element) => {
                        cardRefs.current[choice] = element
                      }}
                      type="button"
                      aria-label={`Answer ${choice}${right ? ', the right answer' : ''}`}
                      onClick={() => pickTotal(choice)}
                      disabled={sending || state.step !== 'total'}
                      className={`tap-target rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hundreds ${right ? 'ring-8 ring-hundreds' : ''}`}
                    >
                      <PlayingCard digit={choice} />
                    </button>
                  )
                })}
              </div>
            )}

            <div role="group" aria-label="Your box" className="flex flex-wrap justify-center gap-2">
              {tiles.map((tile) => {
                const open = state.my_open.includes(tile)
                const isSelected = selected.includes(tile)
                const justShut = (state.shut_tiles ?? []).includes(tile) && state.step !== 'shut'
                return (
                  <button
                    key={tile}
                    ref={(element) => {
                      tileRefs.current[tile] = element
                    }}
                    type="button"
                    aria-label={`Tile ${tile}${open ? '' : ', shut'}`}
                    aria-pressed={state.step === 'shut' && open ? isSelected : undefined}
                    onClick={() => toggleTile(tile)}
                    disabled={sending || state.step !== 'shut' || !open}
                    className={`tap-target w-16 rounded-xl border-4 font-display text-3xl font-bold ${
                      open ? 'border-felt-edge bg-card text-ink' : 'border-chalk/40 bg-felt-edge text-chalk'
                    } ${isSelected ? 'ring-4 ring-hundreds ring-offset-2 ring-offset-felt' : ''} ${justShut ? 'outline outline-4 outline-hundreds' : ''}`}
                  >
                    {tile}
                  </button>
                )
              })}
            </div>

            {state.step === 'shut' && (
              <button
                type="button"
                onClick={shut}
                disabled={sending || selected.length === 0}
                className="tap-target rounded-2xl bg-hundreds px-10 font-display text-2xl font-bold text-ink disabled:opacity-40"
              >
                Shut
              </button>
            )}

            {state.step === 'pass' && (
              <div className="flex flex-wrap items-center justify-center gap-4">
                {shutMessage && <p className="font-display text-2xl font-semibold text-chalk">{shutMessage}</p>}
                <button
                  type="button"
                  onClick={roboTurn}
                  disabled={sending}
                  className="tap-target flex items-center gap-3 rounded-2xl bg-hundreds px-8 font-display text-2xl font-bold text-ink"
                >
                  Robo's turn
                  <NextArrow />
                </button>
              </div>
            )}

            {state.step === 'over' && (
              <div
                role="group"
                aria-label="Game result"
                aria-live="polite"
                className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 text-ink"
              >
                <p className="font-display text-xl font-semibold">{`You have ${tilesOpen(state.my_open.length)}. Robo has ${tilesOpen(state.robo_open.length)}.`}</p>
                <p className="font-display text-3xl font-bold">{RESULTS[state.winner ?? 'same']}</p>
                <button
                  type="button"
                  aria-label="Play again"
                  onClick={dealGame}
                  className="tap-target flex items-center gap-3 rounded-2xl bg-hundreds px-8 font-display text-2xl font-bold text-ink"
                >
                  Play again
                  <NextArrow />
                </button>
              </div>
            )}
          </div>
        </GameTable>

        {moveError && (
          <p className="font-display text-lg font-semibold text-alert-text">Couldn't send that — try again.</p>
        )}
      </main>
    </div>
  )
}

export default ShutTheBoxPage
