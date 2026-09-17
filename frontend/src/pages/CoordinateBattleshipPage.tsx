import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import GameTable from '../components/GameTable'
import HomeButton from '../components/HomeButton'
import LightbulbIcon from '../components/LightbulbIcon'
import MuteToggle from '../components/MuteToggle'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import { postJson } from '../api'
import { formatMisconception } from '../format'
import { getSessionId } from '../session'
import { playSound } from '../sound'

type Step = 'aim' | 'write' | 'pass' | 'robo' | 'read' | 'over'

type Point = [number, number]

type Shot = { x: number; y: number; hit: boolean }

type VisibleState = {
  level: number
  size: number
  turns: number
  turn: number
  step: Step
  robo_ocean: { shots: Shot[]; sunk: Point[][]; ships: Point[][] | null }
  my_ocean: { ships: Point[][]; shots: Shot[] }
  aim: Point | null
  written: Point | null
  robo_call: Point | null
  tapped: Point | null
  my_hits: number
  robo_hits: number
  fleet: number
  my_sunk: number
  robo_sunk: number
  winner: 'mine' | 'robo' | 'same' | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

/** The last graded move as the panel shows it. */
type Result = { kind: 'write' | 'read'; correct: boolean; misconception: string | null; message: string }

/** Grid spacing: every point gets a full 64 px tap target. */
const STEP = 64
const LABEL = 28

const PANEL_BUTTON = 'rounded-2xl px-6 font-display text-xl font-semibold'

const OUTCOMES = { mine: 'You win!', robo: 'Robo wins.', same: "It's a tie!" }

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/coordinate-plane-battleship/rounds?session_id=${getSessionId()}`)
}

function pair(point: Point | null): string {
  return point ? `(${point[0]}, ${point[1]})` : ''
}

function same(a: Point | null, b: Point | null): boolean {
  return a !== null && b !== null && a[0] === b[0] && a[1] === b[1]
}

type Mark = { point: Point; kind: 'hit' | 'miss' | 'ship' | 'sunk' }

/**
 * A first-quadrant grid from 0 to `size` with numbered axes. Every point is a button, so the student taps the
 * points where lines cross, never the squares. Marks: a ship point, a hit, a miss; `ring` outlines one point
 * (the aim or the right answer) and `wrong` another (the student's wrong tap). Static: nothing animates.
 */
function Ocean({
  label,
  size,
  marks,
  ring,
  wrong,
  onTap,
}: {
  label: string
  size: number
  marks: Mark[]
  ring: Point | null
  wrong: Point | null
  onTap: ((point: Point) => void) | null
}) {
  const span = size * STEP
  const left = (x: number) => LABEL + STEP / 2 + x * STEP
  const top = (y: number) => STEP / 2 + (size - y) * STEP
  const points: Point[] = []
  for (let y = size; y >= 0; y -= 1) for (let x = 0; x <= size; x += 1) points.push([x, y])
  const markAt = (point: Point) => marks.filter((mark) => same(mark.point, point)).map((mark) => mark.kind)

  return (
    <div role="group" aria-label={label} className="relative" style={{ width: LABEL + span + STEP, height: span + STEP + LABEL }}>
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full">
        {Array.from({ length: size + 1 }, (_, line) => (
          <g key={line}>
            <line x1={left(line)} x2={left(line)} y1={top(size)} y2={top(0)} strokeWidth={line === 0 ? 4 : 2} className="stroke-chalk" />
            <line x1={left(0)} x2={left(size)} y1={top(line)} y2={top(line)} strokeWidth={line === 0 ? 4 : 2} className="stroke-chalk" />
            <text x={left(line)} y={top(0) + STEP / 2 + 6} textAnchor="middle" className="fill-chalk font-display text-lg font-bold">
              {line}
            </text>
            <text x={LABEL / 2} y={top(line) + 6} textAnchor="middle" className="fill-chalk font-display text-lg font-bold">
              {line}
            </text>
          </g>
        ))}
      </svg>
      {points.map((point) => {
        const kinds = markAt(point)
        const description = kinds.includes('hit') || kinds.includes('sunk') ? ', hit' : kinds.includes('miss') ? ', miss' : ''
        const ship = kinds.includes('ship') ? ', your ship' : ''
        return (
          <button
            key={`${point[0]}-${point[1]}`}
            type="button"
            aria-label={`Point ${pair(point)}${ship}${description}`}
            disabled={!onTap}
            onClick={() => onTap?.(point)}
            className="tap-target absolute flex w-16 items-center justify-center rounded-full"
            style={{ left: left(point[0]) - STEP / 2, top: top(point[1]) - STEP / 2 }}
          >
            <span
              aria-hidden="true"
              className={`flex items-center justify-center rounded-full font-display text-xl font-bold ${
                kinds.includes('hit') || kinds.includes('sunk')
                  ? 'h-8 w-8 bg-ones text-ink'
                  : kinds.includes('miss')
                    ? 'h-8 w-8 border-4 border-chalk bg-felt-edge'
                    : kinds.includes('ship')
                      ? 'h-8 w-8 bg-tens'
                      : 'h-3 w-3 bg-chalk'
              } ${same(point, ring) ? 'ring-4 ring-hundreds ring-offset-2 ring-offset-felt' : ''} ${
                same(point, wrong) ? 'outline-dashed outline-4 outline-offset-4 outline-chalk' : ''
              }`}
            >
              {kinds.includes('hit') || kinds.includes('sunk') ? '×' : ''}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Coordinate Plane Battleship on the game table: 8 turns each against Robo. On your shot, tap a point on Robo's
 * ocean to aim, write its ordered pair with the number buttons and fire; the shot lands where your pair says.
 * On Robo's shot, Robo calls a pair and you tap that point on your ocean. A wrong pair or tap shows both points
 * and offers "Show me why". One ocean shows at a time. Most hits wins; sinking the whole fleet wins at once.
 */
function CoordinateBattleshipPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [digits, setDigits] = useState<number[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintError, setHintError] = useState(false)
  const [finished, setFinished] = useState(false)
  const hintRequest = useRef<AbortController | null>(null)

  const clearResult = useCallback(() => {
    hintRequest.current?.abort()
    setResult(null)
    setHint(null)
    setHintError(false)
  }, [])

  const showRound = useCallback(
    (payload: RoundPayload) => {
      clearResult()
      setRoundId(payload.round_id)
      setState(payload.visible_state)
      setProgress(payload.progress)
      setLoadError(false)
      setMoveError(false)
      setDigits([])
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
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't set up the oceans — try again.</p>
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
        <p className="font-display text-2xl font-bold">Hiding the ships...</p>
      </div>
    )
  }

  const sendMove = (move: object, onDone: (moveResult: MoveResult) => void) => {
    setSending(true)
    setMoveError(false)
    postJson<MoveResult>(`/rounds/${roundId}/moves`, { move })
      .then(onDone)
      .catch(() => setMoveError(true))
      .finally(() => setSending(false))
  }

  const graded = (moveResult: MoveResult, kind: 'write' | 'read', message: string) => {
    playSound(moveResult.correct ? 'correct' : 'wrong')
    setResult({ kind, correct: moveResult.correct, misconception: moveResult.misconception, message })
    setProgress((p) => p && { ...p, correct_in_a_row: moveResult.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0 })
  }

  const aim = (point: Point) => {
    playSound('tap')
    clearResult()
    setDigits([])
    sendMove({ type: 'aim', x: point[0], y: point[1] }, (moveResult) => setState(moveResult.visible_state))
  }

  const pressDigit = (digit: number) => {
    playSound('tap')
    setDigits((current) => (current.length < 2 ? [...current, digit] : current))
  }

  const fire = () => {
    const written: Point = [digits[0], digits[1]]
    sendMove({ type: 'write', x: written[0], y: written[1] }, (moveResult) => {
      const next = moveResult.visible_state
      const shot = next.robo_ocean.shots.find((each) => same([each.x, each.y], written))
      const landed = `Your shot at ${pair(written)}: ${shot?.hit ? 'hit!' : 'miss.'}`
      setState(next)
      setDigits([])
      graded(
        moveResult,
        'write',
        moveResult.correct ? `Right! ${landed}` : `Not quite — your aim was ${pair(state.aim)}, and you wrote ${pair(written)}. ${landed}`,
      )
    })
  }

  const roboTurn = () => {
    playSound('tap')
    clearResult()
    sendMove({ type: 'robo_turn' }, (moveResult) => setState(moveResult.visible_state))
  }

  const read = (point: Point) => {
    const call = state.robo_call
    sendMove({ type: 'read', x: point[0], y: point[1] }, (moveResult) => {
      const next = moveResult.visible_state
      const shot = next.my_ocean.shots.find((each) => same([each.x, each.y], call))
      const landed = `Robo's shot at ${pair(call)}: ${shot?.hit ? 'hit!' : 'miss.'}`
      setState(next)
      graded(
        moveResult,
        'read',
        moveResult.correct ? `Right! ${landed}` : `Not quite — Robo called ${pair(call)}, and you tapped ${pair(point)}. ${landed}`,
      )
    })
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

  const showingMine = state.step === 'read' || (result?.kind === 'read' && state.step !== 'over')
  const robosMarks: Mark[] = [
    ...state.robo_ocean.shots.map((shot): Mark => ({ point: [shot.x, shot.y], kind: shot.hit ? 'hit' : 'miss' })),
    ...(state.robo_ocean.ships ?? []).flat().map((point): Mark => ({ point, kind: 'ship' })),
  ]
  const myMarks: Mark[] = [
    ...state.my_ocean.ships.flat().map((point): Mark => ({ point, kind: 'ship' })),
    ...state.my_ocean.shots.map((shot): Mark => ({ point: [shot.x, shot.y], kind: shot.hit ? 'hit' : 'miss' })),
  ]
  const writing = state.step === 'write'
  const instruction =
    state.step === 'aim' && !result
      ? "Tap a point on Robo's ocean to aim."
      : writing
        ? `Write the ordered pair for your aim, then fire.`
        : state.step === 'read'
          ? `Robo calls ${pair(state.robo_call)}. Tap that point on your ocean.`
          : null
  const spoken = finished && state.winner ? OUTCOMES[state.winner] : [instruction, result?.message].filter(Boolean).join(' ')

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader
        left={<HomeButton />}
        right={
          <>
            <MuteToggle />
            <Link to="/summary" className="tap-target inline-flex items-center px-2 font-display font-semibold text-ink-muted">
              Session summary
            </Link>
          </>
        }
      />

      <main className="flex flex-1 flex-col items-center gap-4 px-4 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <h1 className="font-display text-4xl font-bold">Coordinate Plane Battleship</h1>
          <ReadAloudButton text={spoken || 'Find Robo\'s ships.'} label="Read the instructions aloud" />
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          <div className="flex flex-col items-center gap-4">
            <p className="font-display text-xl font-semibold text-chalk">
              {`${showingMine ? 'Your ocean' : "Robo's ocean"} · Turn ${state.turn} of ${state.turns} · Your hits ${state.my_hits} · Robo's hits ${state.robo_hits}`}
            </p>
            {instruction && <p className="font-display text-2xl font-semibold text-chalk">{instruction}</p>}

            <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
              <div className="flex flex-col items-center gap-2">
                {showingMine ? (
                  <Ocean
                    label="Your ocean"
                    size={state.size}
                    marks={myMarks}
                    ring={result?.kind === 'read' && !result.correct ? state.robo_call : null}
                    wrong={result?.kind === 'read' && !result.correct ? state.tapped : null}
                    onTap={state.step === 'read' && !sending ? read : null}
                  />
                ) : (
                  <Ocean
                    label="Robo's ocean"
                    size={state.size}
                    marks={robosMarks}
                    ring={state.aim}
                    wrong={result?.kind === 'write' && !result.correct ? state.written : null}
                    onTap={(state.step === 'aim' || state.step === 'write') && !sending ? aim : null}
                  />
                )}
              </div>

              <div
                aria-live="polite"
                className="flex w-full max-w-xs flex-col items-start gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 md:w-64"
              >
                {writing && (
                  <>
                    <p aria-label={`Your pair: ${digits.length ? `(${digits[0]}, ${digits[1] ?? ''})` : 'empty'}`} className="font-display text-4xl font-bold">
                      ( <span className="inline-block w-8 border-b-4 border-ink text-center">{digits[0] ?? ''}</span> ,{' '}
                      <span className="inline-block w-8 border-b-4 border-ink text-center">{digits[1] ?? ''}</span> )
                    </p>
                    <div role="group" aria-label="Number buttons" className="grid grid-cols-3 gap-2">
                      {Array.from({ length: state.size + 1 }, (_, digit) => (
                        <button
                          key={digit}
                          type="button"
                          onClick={() => pressDigit(digit)}
                          disabled={digits.length === 2}
                          className="tap-target rounded-2xl bg-white font-display text-3xl font-bold text-ink shadow-[0_4px_0_rgba(0,0,0,0.15)] disabled:opacity-40"
                        >
                          {digit}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setDigits((current) => current.slice(0, -1))}
                        disabled={digits.length === 0}
                        className={`tap-target ${PANEL_BUTTON} border-4 border-ink bg-white text-ink disabled:opacity-40`}
                      >
                        Undo
                      </button>
                      <button
                        type="button"
                        onClick={fire}
                        disabled={digits.length < 2 || sending}
                        className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink disabled:opacity-40`}
                      >
                        Fire
                      </button>
                    </div>
                  </>
                )}
                {result && (
                  <p className={`font-display text-xl font-bold ${result.correct ? 'text-success-text' : 'text-alert-text'}`}>
                    {result.message}
                  </p>
                )}
                {result && !result.correct && hint === null && (
                  <button
                    type="button"
                    onClick={showWhy}
                    className={`tap-target ${PANEL_BUTTON} inline-flex items-center gap-2 border-4 border-ink bg-white text-ink`}
                  >
                    <LightbulbIcon />
                    Show me why
                  </button>
                )}
                {hintError && <p className="font-semibold text-alert-text">Couldn't load the hint — try again.</p>}
                {hint && result && (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-lg">{hint}</p>
                    <div className="flex w-full items-center justify-between gap-2">
                      <p className="text-sm text-ink-muted">
                        {result.misconception && `Diagnosed pattern: ${formatMisconception(result.misconception)}`}
                      </p>
                      <ReadAloudButton text={hint} label="Read the hint aloud" />
                    </div>
                  </div>
                )}
                {state.step === 'pass' && (
                  <button type="button" onClick={roboTurn} disabled={sending} className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}>
                    Robo's turn
                  </button>
                )}
                {state.step === 'aim' && result?.kind === 'read' && (
                  <button type="button" onClick={clearResult} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                    Next turn
                  </button>
                )}
                {state.step === 'aim' && !result && (
                  <p className="text-lg">{`Ships sunk: yours ${state.my_sunk} of ${state.fleet}, Robo's ${state.robo_sunk} of ${state.fleet}.`}</p>
                )}
                {state.step === 'over' && !finished && (
                  <button type="button" onClick={() => setFinished(true)} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                    See who won
                  </button>
                )}
                {state.step === 'over' && finished && state.winner && (
                  <div role="group" aria-label="Game result" className="flex flex-col items-start gap-2">
                    <p className="font-display text-xl font-semibold">{`Your hits ${state.my_hits} · Robo's hits ${state.robo_hits}`}</p>
                    <p className="font-display text-3xl font-bold">{OUTCOMES[state.winner]}</p>
                    <button type="button" onClick={dealGame} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                      Play again
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

export default CoordinateBattleshipPage
