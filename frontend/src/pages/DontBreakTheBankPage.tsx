import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import DiceFace from '../components/DiceFace'
import GameTable from '../components/GameTable'
import HintPanel from '../components/HintPanel'
import HomeButton from '../components/HomeButton'
import Keypad from '../components/Keypad'
import MuteToggle from '../components/MuteToggle'
import PlayingCard from '../components/PlayingCard'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import SeatName from '../components/SeatName'
import { postJson } from '../api'
import { chipColor, placeLetter, type Column } from '../columns'
import { useRoundHint } from '../roundHint'
import { getSessionId } from '../session'
import { playSound } from '../sound'

type Step = 'place' | 'sum' | 'distance' | 'pass' | 'over'

type Winner = 'mine' | 'robo' | 'same' | 'nobody'

type VisibleState = {
  level: number
  numbers: number
  width: number
  bank: number
  die: 'six' | 'ten'
  step: Step
  roll: number | null
  rolls_left: number
  my_board: (number | null)[]
  robo_board: (number | null)[]
  robo_last_spot: number | null
  my_numbers: number[] | null
  sum_answer: number | null
  my_total: number | null
  broke: boolean | null
  distance_answer: number | null
  my_distance: number | null
  robo_numbers: number[] | null
  robo_total: number | null
  robo_distance: number | null
  winner: Winner | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

/** Every answer the game asks for fits in 6 digits, even a sum written column by column (81714). */
const MAX_DIGITS = 6

const PANEL_BUTTON = 'rounded-2xl px-6 font-display text-xl font-semibold'

const PLACES: Column[] = ['hundreds', 'tens', 'ones']

const OUTCOMES: Record<Winner, string> = {
  mine: 'You win!',
  robo: 'Robo wins.',
  same: "It's a tie!",
  nobody: 'You both broke the bank.',
}

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/dont-break-the-bank/rounds?session_id=${getSessionId()}`)
}

function placesFor(width: number): Column[] {
  return PLACES.slice(PLACES.length - width)
}

function rowsOf<T>(board: T[], width: number): T[][] {
  return Array.from({ length: board.length / width }, (_, row) => board.slice(row * width, (row + 1) * width))
}

/** The place headers over a board's columns: colored chips with a letter, so place isn't color alone. */
function PlaceHeaders({ width, cell }: { width: number; cell: string }) {
  return (
    <div aria-hidden="true" className="flex gap-2">
      {placesFor(width).map((place) => (
        <span
          key={place}
          className={`flex ${cell} h-7 items-center justify-center rounded-lg font-display text-base font-bold text-ink ${chipColor[place]}`}
        >
          {placeLetter[place]}
        </span>
      ))}
    </div>
  )
}

/** The roll to place: a die for 1–6, a number card for the 0–9 die. */
function Roll({ value, die }: { value: number; die: 'six' | 'ten' }) {
  return die === 'six' ? <DiceFace value={value} /> : <PlayingCard digit={value} />
}

/**
 * The student's board: one row per number, a spot per digit under its place header. While placing, empty
 * spots are buttons named by number and place ("Number 2, tens"); filled spots show their digit.
 */
function Board({
  state,
  placing,
  onPlace,
}: {
  state: VisibleState
  placing: boolean
  onPlace: (spot: number) => void
}) {
  const places = placesFor(state.width)
  return (
    <div className="flex flex-col items-end gap-2">
      <PlaceHeaders width={state.width} cell="w-16" />
      <div role="group" aria-label="Your numbers" className="flex flex-col gap-2">
        {rowsOf(state.my_board, state.width).map((row, number) => (
          <div key={number} className="flex items-center gap-2">
            {number === state.numbers - 1 && (
              <span aria-hidden="true" className="w-8 text-center font-display text-4xl font-bold text-chalk">
                +
              </span>
            )}
            {row.map((digit, index) => {
              const spot = number * state.width + index
              const label = `Number ${number + 1}, ${places[index]}`
              return digit === null ? (
                <button
                  key={spot}
                  type="button"
                  aria-label={label}
                  onClick={() => onPlace(spot)}
                  disabled={!placing}
                  className="tap-target w-16 rounded-xl border-4 border-dashed border-chalk/70 bg-felt-edge"
                />
              ) : (
                <span
                  key={spot}
                  aria-label={`${label}: ${digit}`}
                  className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-felt-edge bg-card font-display text-4xl font-bold text-ink"
                >
                  {digit}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

/** A typed answer, right-aligned in digit cells under the board's columns, with at least one cell per place plus one. */
function AnswerRow({ typed, width, label }: { typed: string; width: number; label: string }) {
  const cells = Math.max(width + 1, typed.length)
  const digits = typed.padStart(cells, ' ').split('')
  return (
    <div className="flex flex-col items-end gap-2">
      <div aria-hidden="true" className="h-1 w-full rounded-full bg-chalk" />
      <div aria-label={`${label}: ${typed || 'empty'}`} className="flex gap-2">
        {digits.map((digit, index) => (
          <span
            key={index}
            className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-ink bg-white font-display text-4xl font-bold text-ink"
          >
            {digit.trim()}
          </span>
        ))}
      </div>
    </div>
  )
}

/** The bank take away the total, in columns, for the distance question. */
function DistanceRows({ bank, total }: { bank: number; total: number }) {
  const width = String(bank).length
  const row = (value: number, sign: string) => (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="w-8 text-center font-display text-4xl font-bold text-chalk">
        {sign}
      </span>
      {String(value)
        .padStart(width, ' ')
        .split('')
        .map((digit, index) => (
          <span
            key={index}
            className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-felt-edge bg-card font-display text-4xl font-bold text-ink"
          >
            {digit.trim()}
          </span>
        ))}
    </div>
  )
  return (
    <div role="group" aria-label={`${bank} take away ${total}`} className="flex flex-col items-end gap-2">
      {row(bank, '')}
      {row(total, '−')}
    </div>
  )
}

/**
 * Robo's seat; while placing, its board in small cells and where it put the latest roll; at the end, its sum.
 * The board hides after placing so the student's adding fits a tablet; Robo's numbers come back in words.
 */
function RoboBoard({ state, showResult }: { state: VisibleState; showResult: boolean }) {
  const places = placesFor(state.width)
  const last = state.robo_last_spot
  const placedLine =
    state.step === 'place' && last !== null
      ? `Robo put its ${state.robo_board[last]} in the ${places[last % state.width]} of number ${Math.floor(last / state.width) + 1}.`
      : null
  const resultLine =
    showResult && state.robo_numbers && state.robo_total !== null
      ? `Robo's numbers make ${state.robo_numbers.join(' + ')} = ${state.robo_total}. ${
          state.robo_distance === null ? 'Robo broke the bank.' : `That is ${state.robo_distance} away from ${state.bank}.`
        }`
      : null
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <SeatName name="Robo" />
      {state.step === 'place' && (
        <div
          role="img"
          aria-label={`Robo's numbers: ${rowsOf(state.robo_board, state.width)
            .map((row) => row.map((digit) => (digit === null ? 'blank' : digit)).join(' '))
            .join(', ')}`}
          className="flex flex-col items-end gap-1"
        >
          <PlaceHeaders width={state.width} cell="w-8" />
          {rowsOf(state.robo_board, state.width).map((row, number) => (
            <div key={number} className="flex gap-2">
              {row.map((digit, index) => (
                <span
                  key={index}
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center rounded-md border-2 font-display text-lg font-bold ${
                    digit === null ? 'border-dashed border-chalk/70 bg-felt-edge' : 'border-felt-edge bg-card text-ink'
                  } ${number * state.width + index === last ? 'ring-4 ring-hundreds' : ''}`}
                >
                  {digit ?? ''}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      {(placedLine || resultLine) && (
        <p className="max-w-xs font-display text-xl font-semibold text-chalk">{resultLine ?? placedLine}</p>
      )}
    </div>
  )
}

/**
 * Don't Break the Bank on the game table. The same rolls come to both players: the student taps a spot for
 * each roll and Robo places it on its own board beside. With the board full the student types the sum on the
 * keypad; when it isn't over the bank, "How far from the bank?" asks for the distance the same way. Each
 * answer's verdict, "Show me why", the hint and the diagnosed pattern sit in the panel where the keypad was.
 * Robo's result shows on "Robo's turn" and the winner on "See who won", one new thing at a time. No animation.
 */
function DontBreakTheBankPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<MoveResult | null>(null)
  const [askingDistance, setAskingDistance] = useState(false)
  const [finished, setFinished] = useState(false)
  const { hint, hintError, showWhy, clearHint } = useRoundHint()

  const clearResult = useCallback(() => {
    setResult(null)
    clearHint()
  }, [clearHint])

  const showRound = useCallback(
    (payload: RoundPayload) => {
      clearResult()
      setRoundId(payload.round_id)
      setState(payload.visible_state)
      setProgress(payload.progress)
      setLoadError(false)
      setMoveError(false)
      setTyped('')
      setAskingDistance(false)
      setFinished(false)
    },
    [clearResult],
  )

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
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't start a game — try again.</p>
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
        <p className="font-display text-2xl font-bold">Getting the bank ready...</p>
      </div>
    )
  }

  const typingSum = state.step === 'sum'
  const typingDistance = state.step === 'distance' && askingDistance
  const typing = typingSum || typingDistance
  const total = state.my_numbers ? state.my_numbers.reduce((a, b) => a + b, 0) : null

  const sendMove = (move: object, onDone: (moveResult: MoveResult) => void) => {
    setSending(true)
    setMoveError(false)
    postJson<MoveResult>(`/rounds/${roundId}/moves`, { move })
      .then(onDone)
      .catch(() => setMoveError(true))
      .finally(() => setSending(false))
  }

  const place = (spot: number) => {
    playSound('tap')
    sendMove({ type: 'place', spot }, (moveResult) => setState(moveResult.visible_state))
  }

  const pressDigit = (digit: string) => {
    playSound('tap')
    setTyped((current) => (current.length < MAX_DIGITS ? (current + digit).replace(/^0+(?=\d)/, '') : current))
  }

  const pressDelete = () => {
    playSound('tap')
    setTyped((current) => current.slice(0, -1))
  }

  const check = () => {
    const type = typingSum ? 'sum' : 'distance'
    sendMove({ type, answer: Number(typed) }, (moveResult) => {
      playSound(moveResult.correct ? 'correct' : 'wrong')
      setResult(moveResult)
      setState(moveResult.visible_state)
      setTyped('')
      setAskingDistance(false)
      setProgress(
        (p) => p && { ...p, correct_in_a_row: moveResult.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0 },
      )
    })
  }

  const askDistance = () => {
    playSound('tap')
    clearResult()
    setAskingDistance(true)
  }

  const roboTurn = () => {
    playSound('tap')
    clearResult()
    sendMove({ type: 'robo_turn' }, (moveResult) => setState(moveResult.visible_state))
  }

  const lastAnswer = result && (state.distance_answer !== null ? 'distance' : 'sum')
  const verdict =
    result && lastAnswer === 'sum'
      ? result.correct
        ? `Right! ${state.my_numbers?.join(' + ')} = ${state.my_total}.`
        : `Not quite — ${state.my_numbers?.join(' + ')} = ${state.my_total}.`
      : result
        ? result.correct
          ? `Right! ${state.bank} − ${total} = ${state.my_distance}.`
          : `Not quite — ${state.bank} − ${total} = ${state.my_distance}.`
        : null
  const bankLine =
    state.broke === null
      ? null
      : state.broke
        ? `${state.my_total} is more than ${state.bank} — you broke the bank.`
        : null

  const instruction =
    state.step === 'place' && state.roll !== null
      ? `You rolled a ${state.roll}. Tap a spot for it.`
      : typingSum
        ? 'Add your numbers.'
        : typingDistance
          ? `How far is ${total} from ${state.bank}?`
          : null
  const spoken = finished
    ? OUTCOMES[state.winner ?? 'same']
    : [instruction, verdict, bankLine].filter(Boolean).join(' ') || `Don't go over ${state.bank}.`

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
          <h1 className="font-display text-4xl font-bold">Don't Break the Bank</h1>
          <ReadAloudButton text={spoken} label="Read the instructions aloud" />
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          <div className="flex flex-col items-center gap-5">
            <div className="flex w-full flex-wrap items-center justify-between gap-4">
              <RoboBoard state={state} showResult={state.step === 'over'} />
              <p className="font-display text-2xl font-bold text-chalk">{`Bank: ${state.bank}`}</p>
            </div>

            <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
              <div className="flex flex-col items-center gap-4">
                {instruction && (
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {state.step === 'place' && <SeatName name="You" />}
                    {state.step === 'place' && state.roll !== null && <Roll value={state.roll} die={state.die} />}
                    <p className="font-display text-2xl font-semibold text-chalk">{instruction}</p>
                  </div>
                )}
                {typingDistance && total !== null ? (
                  <div className="flex flex-col items-end gap-2">
                    <DistanceRows bank={state.bank} total={total} />
                    <AnswerRow typed={typed} width={String(state.bank).length - 1} label="Your distance" />
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-2">
                    <Board state={state} placing={state.step === 'place' && !sending} onPlace={place} />
                    {typingSum && <AnswerRow typed={typed} width={state.width} label="Your sum" />}
                  </div>
                )}
              </div>

              {typing ? (
                <Keypad onDigit={pressDigit} onDelete={pressDelete} onCheck={check} checkDisabled={typed === '' || sending} />
              ) : (
                state.step !== 'place' && (
                  <div
                    aria-live="polite"
                    className="flex w-full max-w-sm flex-col items-start gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 md:w-96"
                  >
                    {verdict && (
                      <p className={`font-display text-2xl font-bold ${result?.correct ? 'text-success-text' : 'text-alert-text'}`}>
                        {verdict}
                      </p>
                    )}
                    <HintPanel
                      wrong={Boolean(result && !result.correct)}
                      hint={hint}
                      hintError={hintError}
                      misconception={result?.misconception ?? null}
                      onShowWhy={() => showWhy(roundId)}
                    />
                    {bankLine && state.step === 'pass' && <p className="font-display text-xl font-semibold">{bankLine}</p>}
                    {state.step === 'distance' && !askingDistance && (
                      <button type="button" onClick={askDistance} className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}>
                        {`How far from ${state.bank}?`}
                      </button>
                    )}
                    {state.step === 'pass' && (
                      <button
                        type="button"
                        onClick={roboTurn}
                        disabled={sending}
                        className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}
                      >
                        Robo's turn
                      </button>
                    )}
                    {state.step === 'over' && !finished && (
                      <button type="button" onClick={() => setFinished(true)} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                        See who won
                      </button>
                    )}
                    {state.step === 'over' && finished && state.winner && (
                      <div role="group" aria-label="Game result" className="flex flex-col items-start gap-3">
                        <p className="font-display text-xl font-semibold">
                          {state.broke ? `You made ${state.my_total}: over the bank.` : `You made ${state.my_total}: ${state.my_distance} away.`}
                        </p>
                        <p className="font-display text-3xl font-bold">{OUTCOMES[state.winner]}</p>
                        <button type="button" onClick={dealGame} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                          Play again
                        </button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        </GameTable>

        {moveError && (
          <p className="font-display text-lg font-semibold text-alert-text">Couldn't send that — try again.</p>
        )}
      </main>
    </div>
  )
}

export default DontBreakTheBankPage
