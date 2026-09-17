import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import ClockFace from '../components/ClockFace'
import type { Clock } from '../clock'
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

type Time = [number, number]

type VisibleState = {
  level: number
  kind: 'read' | 'set'
  time: Time | null
  clock: Clock | null
  choices: number[][]
  pick: number | null
  right: number | null
  robo: { kind: 'read' | 'set'; time: Time; clock: Clock; knows: boolean } | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

const TURNS = 8

const PANEL_BUTTON = 'rounded-2xl px-6 font-display text-xl font-semibold'

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/clock-match/rounds?session_id=${getSessionId()}`)
}

const timeText = ([hour, minute]: number[]) => `${hour}:${String(minute).padStart(2, '0')}`

function outcome(myPoints: number, roboPoints: number) {
  if (myPoints > roboPoints) return 'You win the game!'
  if (myPoints < roboPoints) return 'Robo wins the game.'
  return "It's a draw!"
}

function roboSaid(robo: NonNullable<VisibleState['robo']>): string {
  const time = timeText(robo.time)
  if (robo.kind === 'read') return robo.knows ? `Robo read its clock: ${time}. Right!` : "Robo wasn't sure what time its clock shows."
  return robo.knows ? `Robo picked the clock for ${time}. Right!` : `Robo wasn't sure which clock shows ${time}.`
}

/**
 * Clock Match on the game table: a duel of eight turns against Robo. Each turn is a clock to read (pick its time
 * from four cards) or a time to set (pick its clock from four). One graded pick; a wrong pick outlines the right card
 * and offers "Show me why" with the hint and diagnosed pattern. "Robo's turn" shows Robo's own card, right or "not
 * sure". One new thing shows at a time; the page keeps the score. Nothing animates.
 */
function ClockMatchPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [dealing, setDealing] = useState(false)
  const [moveError, setMoveError] = useState(false)
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

  /** Deal the next card; Next turn and Play again stay off until it arrives, so a double tap deals once. */
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
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't get a clock — try again.</p>
          <button type="button" onClick={dealTurn} className="tap-target rounded-2xl bg-ink px-6 font-display font-semibold text-base">
            Retry
          </button>
        </main>
      </div>
    )
  }

  if (!state || !progress) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <p className="font-display text-2xl font-bold">Winding the clocks...</p>
      </div>
    )
  }

  const pick = (choice: number) => {
    setSending(true)
    setMoveError(false)
    postJson<MoveResult>(`/rounds/${roundId}/moves`, { move: { type: 'pick', choice } })
      .then((moveResult) => {
        playSound(moveResult.correct ? 'correct' : 'wrong')
        setState(moveResult.visible_state)
        setResult(moveResult)
        if (moveResult.correct) setMyPoints((points) => points + 1)
        setProgress((p) => p && { ...p, correct_in_a_row: moveResult.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0 })
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

  const showRobo = () => {
    playSound('tap')
    hintRequest.current?.abort()
    setHint(null)
    setHintError(false)
    setRoboShown(true)
    if (state.robo?.knows) setRoboPoints((points) => points + 1)
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

  const reading = state.kind === 'read'
  const picked = state.pick !== null
  const shownTime = state.time ? timeText(state.time) : ''
  const question = reading ? 'What time is it?' : `Which clock shows ${shownTime}?`
  const verdict = result
    ? reading
      ? result.correct
        ? `Right! It's ${shownTime}.`
        : `Not quite — this clock shows ${shownTime}.`
      : result.correct
        ? `Right! That clock shows ${shownTime}.`
        : `Not quite — the outlined clock shows ${shownTime}.`
    : null
  const spoken = finished ? outcome(myPoints, roboPoints) : [question, verdict, hint, roboShown && state.robo ? roboSaid(state.robo) : null].filter(Boolean).join(' ')

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
          <h1 className="font-display text-4xl font-bold">Clock Match</h1>
          <ReadAloudButton text={spoken} label="Read the instructions aloud" />
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          <div className="flex flex-col items-center gap-4">
            <p className="font-display text-xl font-semibold text-chalk">{`Turn ${turn} of ${TURNS} · You ${myPoints} · Robo ${roboPoints}`}</p>
            <p className="text-center font-display text-3xl font-bold text-chalk">{question}</p>

            <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
              <div className="flex flex-col items-center gap-4">
                {reading && state.clock && <ClockFace clock={state.clock} label="The clock to read" />}
                <div role="group" aria-label="Choices" className="grid grid-cols-2 gap-3">
                  {state.choices.map((each, index) => {
                    const right = picked && state.right === index
                    const name = reading ? timeText(each) : `Clock ${index + 1}`
                    return (
                      <button
                        key={index}
                        type="button"
                        aria-label={`${name}${right && !result?.correct ? ', the right answer' : ''}`}
                        onClick={() => pick(index)}
                        disabled={picked || sending}
                        className={`tap-target flex items-center justify-center rounded-2xl border-2 border-felt-edge bg-card px-4 font-display text-3xl font-bold text-ink ${
                          right ? 'ring-4 ring-hundreds ring-offset-2 ring-offset-felt' : ''
                        } ${picked && !right && state.pick !== index ? 'opacity-60' : ''}`}
                      >
                        {reading ? timeText(each) : <ClockFace clock={each as Clock} label={name} size="small" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {result && (
                <div aria-live="polite" className="flex w-full max-w-xs flex-col items-start gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 md:w-80">
                  <p className={`font-display text-xl font-bold ${result.correct ? 'text-success-text' : 'text-alert-text'}`}>{verdict}</p>
                  {!result.correct && hint === null && !roboShown && (
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
                  {hint && (
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
                  {!roboShown && (
                    <button type="button" onClick={showRobo} className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}>
                      Robo's turn
                    </button>
                  )}
                  {roboShown && state.robo && (
                    <div className="flex items-center gap-3">
                      <ClockFace clock={state.robo.clock} label={`Robo's clock for ${timeText(state.robo.time)}`} size="small" />
                      <p className="font-display text-lg font-semibold">{roboSaid(state.robo)}</p>
                    </div>
                  )}
                  {roboShown && turn < TURNS && (
                    <button type="button" onClick={nextTurn} disabled={dealing} className={`tap-target ${PANEL_BUTTON} bg-ink text-base disabled:opacity-40`}>
                      Next turn
                    </button>
                  )}
                  {roboShown && turn === TURNS && !finished && (
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

export default ClockMatchPage
