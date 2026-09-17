import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { formatMisconception } from '../format'
import { getSessionId } from '../session'
import { playSound } from '../sound'

type Sign = '+' | '-'

type Step = { before: number; sign: Sign; card: number; answer: number; after: number }

type Equation = { left: number[]; right: number }

type VisibleState = {
  level: number
  top: number
  cards: number[]
  target: number
  way: number[]
  total: number | null
  steps: Step[]
  stuck: boolean
  made: boolean
  shown_way: string[] | null
  done: boolean
  robo: { cards: number[]; way: string[] | null } | null
  equation: Equation | null
  equation_answer: number | null
  equation_value: number | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

/** The last graded move as the panel shows it. */
type Result = { correct: boolean; misconception: string | null; message: string }

const HANDS = 5
const MAX_DIGITS = 3

const PANEL_BUTTON = 'rounded-2xl px-6 font-display text-xl font-semibold'

/** A + or − tile; each tag still writes `tap-target` so `check:tap-targets` can see it. */
const TILE = 'w-16 rounded-xl border-2 border-felt-edge bg-card font-display text-4xl font-bold text-ink disabled:opacity-40'

const SHOWN_SIGN: Record<Sign, string> = { '+': '+', '-': '−' }

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/target-number/rounds?session_id=${getSessionId()}`)
}

const stepText = (before: number, sign: Sign, card: number) => `${before} ${SHOWN_SIGN[sign]} ${card}`

/** "16 = 2 + □" or "1 + 15 = 2 + □", with `box` in place of the box. */
const equationText = (equation: Equation, box: string) => `${equation.left.join(' + ')} = ${equation.right} + ${box}`

function outcome(myPoints: number, roboPoints: number) {
  if (myPoints > roboPoints) return 'You win the game!'
  if (myPoints < roboPoints) return 'Robo wins the game.'
  return "It's a draw!"
}

/** Lines of a way, one equation per step. */
function WayLines({ label, lines }: { label: string; lines: string[] }) {
  return (
    <ol aria-label={label} className="flex flex-col items-center gap-1 font-display text-2xl font-semibold text-chalk">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ol>
  )
}

/**
 * Target Number on the game table: a duel of five hands against Robo. Each hand the student makes the target from
 * five cards one step at a time — tap a card to start, then + or −, then a card, and type the new total on the
 * keypad (graded). Every step shows as its own equation. Making the target with every step right scores a point.
 * "Robo's turn" shows Robo's way with its own cards, then one equation question ("16 = 2 + □") is graded. A wrong
 * answer offers "Show me why". One new thing shows at a time; the page keeps the score. Nothing animates.
 */
function TargetNumberPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [dealing, setDealing] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [sign, setSign] = useState<Sign | null>(null)
  const [pick, setPick] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [madeMessage, setMadeMessage] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintError, setHintError] = useState(false)
  const [roboShown, setRoboShown] = useState(false)
  const [hand, setHand] = useState(1)
  const [myPoints, setMyPoints] = useState(0)
  const [roboPoints, setRoboPoints] = useState(0)
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
      setSign(null)
      setPick(null)
      setTyped('')
      setMadeMessage(null)
      setRoboShown(false)
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

  /** Deal the next hand; Next hand and Play again stay off until it arrives, so a double tap deals once. */
  const dealHand = () => {
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
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't deal the cards — try again.</p>
          <button type="button" onClick={dealHand} className="tap-target rounded-2xl bg-ink px-6 font-display font-semibold text-base">
            Retry
          </button>
        </main>
      </div>
    )
  }

  if (!state || !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <p className="font-display text-2xl font-bold">Dealing the cards...</p>
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

  const graded = (moveResult: MoveResult, message: string) => {
    playSound(moveResult.correct ? 'correct' : 'wrong')
    setState(moveResult.visible_state)
    setResult({ correct: moveResult.correct, misconception: moveResult.misconception, message })
    setProgress((p) => p && { ...p, correct_in_a_row: moveResult.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0 })
  }

  const building = !state.done
  const started = state.way.length > 0
  const pending = building && started && sign !== null && pick !== null
  const fits = (index: number) => {
    if (state.way.includes(index)) return false
    if (!started) return true
    if (sign === null || state.total === null) return false
    const after = sign === '+' ? state.total + state.cards[index] : state.total - state.cards[index]
    return after >= 0 && after <= state.top
  }

  const tapCard = (index: number) => {
    playSound('tap')
    if (!started) {
      clearResult()
      sendMove({ type: 'start', card: index }, (moveResult) => setState(moveResult.visible_state))
      return
    }
    setPick(index)
  }

  const tapSign = (chosen: Sign) => {
    playSound('tap')
    clearResult()
    setSign(chosen)
    setPick((current) => {
      if (current === null || state.total === null) return current
      const after = chosen === '+' ? state.total + state.cards[current] : state.total - state.cards[current]
      return after >= 0 && after <= state.top ? current : null
    })
  }

  const pressDigit = (digit: string) => {
    playSound('tap')
    setTyped((current) => (current.length < MAX_DIGITS ? (current + digit).replace(/^0+(?=\d)/, '') : current))
  }

  const pressDelete = () => {
    playSound('tap')
    setTyped((current) => current.slice(0, -1))
  }

  const checkStep = () => {
    if (sign === null || pick === null || state.total === null) return
    const shown = stepText(state.total, sign, state.cards[pick])
    sendMove({ type: 'step', sign, card: pick, answer: Number(typed) }, (moveResult) => {
      const next = moveResult.visible_state
      graded(moveResult, moveResult.correct ? `Right! ${shown} = ${next.total}.` : `Not quite — ${shown} = ${next.total}.`)
      setSign(null)
      setPick(null)
      setTyped('')
      if (next.made) {
        const clean = next.steps.every((each) => each.answer === each.after)
        if (clean) setMyPoints((points) => points + 1)
        setMadeMessage(
          clean
            ? `You made ${next.target} with every step right: a point!`
            : `You made ${next.target}! One step was wrong, so no point this hand.`,
        )
      }
    })
  }

  const startOver = () => {
    playSound('tap')
    clearResult()
    setSign(null)
    setPick(null)
    setTyped('')
    sendMove({ type: 'start_over' }, (moveResult) => setState(moveResult.visible_state))
  }

  const showWay = () => {
    playSound('tap')
    clearResult()
    setSign(null)
    setPick(null)
    setTyped('')
    sendMove({ type: 'show_way' }, (moveResult) => setState(moveResult.visible_state))
  }

  const showRobo = () => {
    playSound('tap')
    clearResult()
    setMadeMessage(null)
    setRoboShown(true)
    if (state.robo?.way) setRoboPoints((points) => points + 1)
  }

  const checkEquation = () => {
    sendMove({ type: 'equation', answer: Number(typed) }, (moveResult) => {
      const next = moveResult.visible_state
      const filled = next.equation ? equationText(next.equation, String(next.equation_value)) : ''
      graded(moveResult, moveResult.correct ? `Right! ${filled}.` : `Not quite — the box is ${next.equation_value}: ${filled}.`)
      setTyped('')
    })
  }

  const nextHand = () => {
    setHand((current) => current + 1)
    dealHand()
  }

  const playAgain = () => {
    setHand(1)
    setMyPoints(0)
    setRoboPoints(0)
    setFinished(false)
    dealHand()
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

  const asking = roboShown && state.equation !== null && state.equation_answer === null
  const answered = roboShown && state.equation_answer !== null
  const instruction = !building
    ? asking
      ? 'What number makes this true?'
      : null
    : !started
      ? `Make ${state.target}. Tap a card to start.`
      : pending && state.total !== null
        ? `What is ${stepText(state.total, sign, state.cards[pick])}?`
        : state.stuck
          ? 'No card fits. Start over or ask for a way.'
          : 'Tap + or −, then a card.'
  const wayLines = state.total !== null && started ? [String(state.cards[state.way[0]]), ...state.steps.map((each) => `${stepText(each.before, each.sign, each.card)} = ${each.after}`)] : []
  const spoken = finished
    ? outcome(myPoints, roboPoints)
    : [instruction, result?.message, madeMessage].filter(Boolean).join(' ') || `Make ${state.target}.`

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
          <h1 className="font-display text-4xl font-bold">Target Number</h1>
          <ReadAloudButton text={spoken} label="Read the instructions aloud" />
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <p className="font-display text-xl font-semibold text-chalk">{`Hand ${hand} of ${HANDS} · You ${myPoints} · Robo ${roboPoints}`}</p>
              <p aria-label={`Target ${state.target}`} className="rounded-full bg-hundreds px-4 font-display text-3xl font-bold text-ink">
                {`Target ${state.target}`}
              </p>
            </div>
            {instruction && <p className="text-center font-display text-2xl font-semibold text-chalk">{instruction}</p>}

            <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
              <div className="flex flex-col items-center gap-4">
                {roboShown && state.robo ? (
                  <>
                    <div role="group" aria-label={`Robo's cards: ${state.robo.cards.join(', ')}`} className="flex flex-col items-center gap-2">
                      <SeatName name="Robo" />
                      <span aria-hidden="true" className="flex gap-2">
                        {state.robo.cards.map((card, index) => (
                          <PlayingCard key={index} digit={card} />
                        ))}
                      </span>
                    </div>
                    {state.robo.way ? (
                      <WayLines label="Robo's way" lines={state.robo.way} />
                    ) : (
                      <p className="font-display text-2xl font-semibold text-chalk">{`Robo couldn't find a way to make ${state.target}.`}</p>
                    )}
                    {state.equation && (
                      <p
                        aria-label={equationText(state.equation, answered ? String(state.equation_answer) : 'box')}
                        className="rounded-2xl bg-card px-4 py-2 font-display text-3xl font-bold text-ink"
                      >
                        {equationText(state.equation, answered ? String(state.equation_answer) : typed || '□')}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div role="group" aria-label="Your cards" className="flex items-center gap-2">
                      {state.cards.map((card, index) => (
                        <button
                          key={index}
                          type="button"
                          aria-label={`Card ${card}`}
                          aria-pressed={pick === index}
                          onClick={() => tapCard(index)}
                          disabled={!building || sending || !fits(index)}
                          className={`tap-target rounded-lg disabled:opacity-40 ${pick === index ? 'ring-4 ring-hundreds ring-offset-2 ring-offset-felt' : ''}`}
                        >
                          <PlayingCard digit={card} />
                        </button>
                      ))}
                    </div>
                    {building && started && (
                      <div role="group" aria-label="Signs" className="flex gap-3">
                        {(['+', '-'] as const).map((each) => (
                          <button
                            key={each}
                            type="button"
                            aria-label={each === '+' ? 'Plus' : 'Minus'}
                            aria-pressed={sign === each}
                            onClick={() => tapSign(each)}
                            disabled={sending}
                            className={`tap-target ${TILE} ${sign === each ? 'ring-4 ring-hundreds ring-offset-2 ring-offset-felt' : ''}`}
                          >
                            {SHOWN_SIGN[each]}
                          </button>
                        ))}
                      </div>
                    )}
                    {state.shown_way ? (
                      <>
                        <p className="font-display text-2xl font-semibold text-chalk">Here's a way:</p>
                        <WayLines label="A way to the target" lines={state.shown_way} />
                      </>
                    ) : (
                      wayLines.length > 0 && <WayLines label="Your way" lines={wayLines} />
                    )}
                    {building && (
                      <div className="flex flex-wrap justify-center gap-3">
                        {started && (
                          <button
                            type="button"
                            onClick={startOver}
                            disabled={sending}
                            className={`tap-target ${PANEL_BUTTON} border-4 border-chalk bg-felt text-chalk`}
                          >
                            Start over
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={showWay}
                          disabled={sending}
                          className={`tap-target ${PANEL_BUTTON} border-4 border-chalk bg-felt text-chalk`}
                        >
                          Show me a way
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {(pending || asking || result || madeMessage || state.done || finished) && (
                <div
                  aria-live="polite"
                  className="flex w-full max-w-xs flex-col items-start gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 md:w-80"
                >
                  {pending && (
                    <>
                      <p aria-label={`Your total: ${typed || 'empty'}`} className="font-display text-4xl font-bold">
                        <span className="inline-block min-w-24 border-b-4 border-ink text-center">{typed || ' '}</span>
                      </p>
                      <Keypad onDigit={pressDigit} onDelete={pressDelete} onCheck={checkStep} checkDisabled={typed === '' || sending} />
                    </>
                  )}
                  {asking && !result && (
                    <Keypad onDigit={pressDigit} onDelete={pressDelete} onCheck={checkEquation} checkDisabled={typed === '' || sending} />
                  )}

                  {result && !pending && (
                    <p className={`font-display text-xl font-bold ${result.correct ? 'text-success-text' : 'text-alert-text'}`}>
                      {result.message}
                    </p>
                  )}
                  {result && !pending && !result.correct && hint === null && (
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
                  {hint && result && !pending && (
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

                  {madeMessage && <p className="font-display text-xl font-bold">{madeMessage}</p>}
                  {state.done && !roboShown && (
                    <button type="button" onClick={showRobo} className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}>
                      Robo's turn
                    </button>
                  )}
                  {answered && hand < HANDS && (
                    <button type="button" onClick={nextHand} disabled={dealing} className={`tap-target ${PANEL_BUTTON} bg-ink text-base disabled:opacity-40`}>
                      Next hand
                    </button>
                  )}
                  {answered && hand === HANDS && !finished && (
                    <button type="button" onClick={() => setFinished(true)} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                      See who won
                    </button>
                  )}
                  {finished && (
                    <div role="group" aria-label="Game result" className="flex flex-col items-start gap-2">
                      <p className="font-display text-xl font-semibold">{`You ${myPoints} · Robo ${roboPoints}`}</p>
                      <p className="font-display text-3xl font-bold">{outcome(myPoints, roboPoints)}</p>
                      <button type="button" onClick={playAgain} disabled={dealing} className={`tap-target ${PANEL_BUTTON} bg-ink text-base disabled:opacity-40`}>
                        Play again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </GameTable>

        {moveError && <p className="font-display text-lg font-semibold text-alert-text">Couldn't send that — try again.</p>}
      </main>
    </div>
  )
}

export default TargetNumberPage
