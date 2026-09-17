import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import GameTable from '../components/GameTable'
import HintPanel from '../components/HintPanel'
import HomeButton from '../components/HomeButton'
import MuteToggle from '../components/MuteToggle'
import PlayingCard from '../components/PlayingCard'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import SeatName from '../components/SeatName'
import { postJson } from '../api'
import { OPERATORS, SPOKEN, SYMBOLS, canTap, expressionText, isComplete, type Token } from '../expressionEntry'
import { useRoundHint } from '../roundHint'
import { getSessionId } from '../session'
import { playSound } from '../sound'

/** An expression as the server shows it: its text, its steps by the rule, and its value (null after ÷ 0). */
type Shown = { text: string; steps: string[]; value: string | null }

type VisibleState = {
  level: number
  cards: number[]
  checks: number
  last_check: Shown | null
  made_24: boolean
  shown_way: Shown | null
  done: boolean
  robo_cards: number[] | null
  robo_way: Shown | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

const HANDS = 5

/** Shared look of the panel buttons; each tag still writes `tap-target` so `check:tap-targets` can see it. */
const PANEL_BUTTON = 'rounded-2xl px-6 font-display text-xl font-semibold'

/** Operator and parenthesis tiles: card stock with a large sign; each tag still writes `tap-target`. */
const TILE = 'w-16 rounded-xl border-2 border-felt-edge bg-card font-display text-4xl font-bold text-ink disabled:opacity-40'

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/the-24-game/rounds?session_id=${getSessionId()}`)
}

function listed(numbers: number[]) {
  return `${numbers.slice(0, -1).join(', ')} and ${numbers.at(-1)}`
}

function outcome(myPoints: number, roboPoints: number) {
  if (myPoints > roboPoints) return 'You win the game!'
  if (myPoints < roboPoints) return 'Robo wins the game.'
  return "It's a draw!"
}

/** An expression's steps in the order the rule does them, one per line. */
function Steps({ shown }: { shown: Shown }) {
  return (
    <ol aria-label={`Steps for ${shown.text}`} className="flex flex-col gap-1 font-display text-xl font-semibold">
      {shown.steps.map((step, index) => (
        <li key={index}>{step}</li>
      ))}
    </ol>
  )
}

/** What the last check made, in words. */
function checkMessage(check: Shown, made24: boolean) {
  if (made24) return `You made 24! ${check.text} = 24.`
  if (check.value === null) return `Not quite — ${check.text} divides by 0, which can't be done.`
  return `Not quite — ${check.text} makes ${check.value}, not 24.`
}

/** Robo's cards and its way to 24, or that it found none; shown once the student presses "Robo's turn". */
function RoboTurn({ cards, way }: { cards: number[]; way: Shown | null }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div role="group" aria-label={`Robo's cards: ${listed(cards)}`} className="flex items-center gap-4">
        <SeatName name="Robo" />
        <span aria-hidden="true" className="flex gap-2">
          {cards.map((card, index) => (
            <PlayingCard key={index} digit={card} />
          ))}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1 text-chalk">
        <p className="font-display text-xl font-semibold">
          {way ? `Robo made 24: ${way.text}` : `Robo couldn't find a way to make 24 with ${listed(cards)}.`}
        </p>
        {way && <p className="font-display text-lg">{way.steps.join(', then ')}</p>}
      </div>
    </div>
  )
}

/**
 * The 24 Game on the game table: a duel of five hands. Each hand the student taps their four cards, the
 * signs and parentheses into an expression and checks it; a wrong check shows what it makes, step by step
 * by the rule, and "Show me why" opens the hint and diagnosed pattern. They can edit and check again, or
 * ask to be shown a way. Robo's own hand appears only on "Robo's turn", and the result only on "See who
 * won", so one new thing shows at a time. The page keeps the score. Nothing animates.
 */
function TwentyFourPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [tokens, setTokens] = useState<Token[]>([])
  const [result, setResult] = useState<MoveResult | null>(null)
  const [roboShown, setRoboShown] = useState(false)
  const [hand, setHand] = useState(1)
  const [myPoints, setMyPoints] = useState(0)
  const [roboPoints, setRoboPoints] = useState(0)
  const [finished, setFinished] = useState(false)
  const { hint, hintError, showWhy, clearHint } = useRoundHint()

  /** Clear the last check's result and hint, so an older hint never sits beside a newer check. */
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
      setTokens([])
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

  const dealHand = () => {
    requestRound()
      .then(showRound)
      .catch(() => setLoadError(true))
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col bg-base">
        <AppHeader left={<HomeButton />} right={<MuteToggle />} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't deal a hand — try again.</p>
          <button
            type="button"
            onClick={dealHand}
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
        <p className="font-display text-2xl font-bold">Dealing your cards...</p>
      </div>
    )
  }

  const cardCount = state.cards.length
  const building = !state.done
  const ready = building && !sending && isComplete(tokens, cardCount)
  const written = expressionText(tokens, state.cards)

  const tap = (token: Token) => {
    playSound('tap')
    setTokens((current) => (canTap(current, token, cardCount) ? [...current, token] : current))
  }

  const undo = () => {
    playSound('tap')
    setTokens((current) => current.slice(0, -1))
  }

  const clear = () => {
    playSound('tap')
    setTokens([])
  }

  const send = (move: object, graded: boolean) => {
    setSending(true)
    setMoveError(false)
    clearResult()
    postJson<MoveResult>(`/rounds/${roundId}/moves`, { move })
      .then((moveResult) => {
        setState(moveResult.visible_state)
        if (!graded) return
        playSound(moveResult.correct ? 'correct' : 'wrong')
        setResult(moveResult)
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

  const check = () => send({ type: 'check', tokens }, true)

  const showWay = () => {
    playSound('tap')
    send({ type: 'show_way' }, false)
  }

  const showRoboTurn = () => {
    playSound('tap')
    if (state.robo_way) setRoboPoints((points) => points + 1)
    clearResult()
    setRoboShown(true)
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

  const roboTurn = roboShown && state.robo_cards ? { cards: state.robo_cards, way: state.robo_way } : null
  const lastCheck = result ? state.last_check : null

  const spoken = finished
    ? `You ${myPoints}, Robo ${roboPoints}. ${outcome(myPoints, roboPoints)}`
    : roboTurn
      ? roboTurn.way
        ? `Robo's cards are ${listed(roboTurn.cards)}. Robo made 24.`
        : `Robo's cards are ${listed(roboTurn.cards)}. Robo couldn't find a way to make 24.`
      : `Hand ${hand} of ${HANDS}. Use all four cards, ${listed(state.cards)}, with plus, minus, times and divided by to make 24.`

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
          <h1 className="font-display text-4xl font-bold">The 24 Game</h1>
          <ReadAloudButton text={spoken} label="Read the instructions aloud" />
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          {finished ? (
            <div
              role="group"
              aria-label="Game result"
              aria-live="polite"
              className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-2 border-felt-edge bg-card p-6"
            >
              <p className="font-display text-2xl font-semibold">{`You ${myPoints} · Robo ${roboPoints}`}</p>
              <p className="font-display text-3xl font-bold">{outcome(myPoints, roboPoints)}</p>
              <button type="button" onClick={playAgain} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                Play again
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <p className="font-display text-xl font-semibold text-chalk">
                {`Hand ${hand} of ${HANDS} · You ${myPoints} · Robo ${roboPoints}`}
              </p>
              {roboTurn && <RoboTurn {...roboTurn} />}
              <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div role="group" aria-label="Your cards" className="flex items-center gap-3">
                    {state.cards.map((card, index) => (
                      <button
                        key={index}
                        type="button"
                        aria-label={`Card ${card}`}
                        onClick={() => tap(index)}
                        disabled={!building || !canTap(tokens, index, cardCount)}
                        className={`tap-target rounded-lg ${tokens.includes(index) ? 'opacity-40' : ''}`}
                      >
                        <PlayingCard digit={card} />
                      </button>
                    ))}
                  </div>
                  {building && (
                    <>
                      <div role="group" aria-label="Signs" className="flex flex-wrap justify-center gap-2">
                        {OPERATORS.map((operator) => (
                          <button
                            key={operator}
                            type="button"
                            aria-label={SPOKEN[operator]}
                            onClick={() => tap(operator)}
                            disabled={!canTap(tokens, operator, cardCount)}
                            className={`tap-target ${TILE}`}
                          >
                            {SYMBOLS[operator]}
                          </button>
                        ))}
                        {(['(', ')'] as const).map((parenthesis) => (
                          <button
                            key={parenthesis}
                            type="button"
                            aria-label={parenthesis === '(' ? 'Open parenthesis' : 'Close parenthesis'}
                            onClick={() => tap(parenthesis)}
                            disabled={!canTap(tokens, parenthesis, cardCount)}
                            className={`tap-target ${TILE}`}
                          >
                            {parenthesis}
                          </button>
                        ))}
                      </div>
                      <p
                        aria-label={`Your expression: ${written || 'empty'}`}
                        className="flex min-h-16 w-full max-w-md items-center justify-center rounded-2xl border-2 border-felt-edge bg-white px-4 font-display text-3xl font-bold text-ink"
                      >
                        {written}
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">
                        <button
                          type="button"
                          onClick={undo}
                          disabled={tokens.length === 0}
                          className={`tap-target ${PANEL_BUTTON} border-4 border-ink bg-white text-ink disabled:opacity-40`}
                        >
                          Undo
                        </button>
                        <button
                          type="button"
                          onClick={clear}
                          disabled={tokens.length === 0}
                          className={`tap-target ${PANEL_BUTTON} border-4 border-ink bg-white text-ink disabled:opacity-40`}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={check}
                          disabled={!ready}
                          className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink disabled:opacity-40`}
                        >
                          Check
                        </button>
                      </div>
                    </>
                  )}
                </div>
                {(lastCheck || state.shown_way || state.done) && (
                  <div
                    aria-live="polite"
                    className="flex w-full max-w-xs flex-col items-start gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 md:w-80"
                  >
                    {lastCheck && result && (
                      <>
                        <p
                          className={`font-display text-2xl font-bold ${result.correct ? 'text-success-text' : 'text-alert-text'}`}
                        >
                          {checkMessage(lastCheck, result.correct)}
                        </p>
                        <Steps shown={lastCheck} />
                      </>
                    )}
                    {state.shown_way && !roboTurn && (
                      <>
                        <p className="font-display text-2xl font-bold">{`Here's a way: ${state.shown_way.text} = 24`}</p>
                        <Steps shown={state.shown_way} />
                      </>
                    )}
                    <HintPanel
                      wrong={Boolean(result && !result.correct)}
                      hint={hint}
                      hintError={hintError}
                      misconception={result?.misconception ?? null}
                      onShowWhy={() => showWhy(roundId)}
                    />
                    {building && (
                      <button
                        type="button"
                        onClick={showWay}
                        disabled={sending}
                        className={`tap-target ${PANEL_BUTTON} border-4 border-ink bg-white text-ink`}
                      >
                        Show me a way
                      </button>
                    )}
                    {state.done && !roboTurn && (
                      <button
                        type="button"
                        onClick={showRoboTurn}
                        className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}
                      >
                        Robo's turn
                      </button>
                    )}
                    {roboTurn && hand < HANDS && (
                      <button type="button" onClick={nextHand} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                        Next hand
                      </button>
                    )}
                    {roboTurn && hand === HANDS && (
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
              {building && !lastCheck && (
                <button
                  type="button"
                  onClick={showWay}
                  disabled={sending}
                  className={`tap-target ${PANEL_BUTTON} border-4 border-chalk bg-felt text-chalk`}
                >
                  Show me a way
                </button>
              )}
            </div>
          )}
        </GameTable>

        {moveError && (
          <p className="font-display text-lg font-semibold text-alert-text">Couldn't send your move — try again.</p>
        )}
      </main>
    </div>
  )
}

export default TwentyFourPage
