import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import CubeBox, { type Box, type Layer } from '../components/CubeBox'
import DuelResult from '../components/DuelResult'
import DuelScoreLine from '../components/DuelScoreLine'
import DuelTurnButtons from '../components/DuelTurnButtons'
import GameTable from '../components/GameTable'
import HintPanel from '../components/HintPanel'
import HomeButton from '../components/HomeButton'
import Keypad from '../components/Keypad'
import MuteToggle from '../components/MuteToggle'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import Verdict from '../components/Verdict'
import { postJson } from '../api'
import { duelOutcome } from '../duel'
import { useRoundHint } from '../roundHint'
import { getLearnerId } from '../learner'
import { getSessionId } from '../session'
import { playSound } from '../sound'

type RoboTurn = { box: Box; layer: number; layers: number; volume: number; built: Box | null }

type VisibleState = {
  level: number
  step: 'count' | 'build' | 'done'
  box: Box
  count: number | null
  volume: number | null
  built: Box | null
  built_volume: number | null
  robo: RoboTurn | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

/** The last graded move as the panel shows it. */
type Result = { kind: 'count' | 'build'; correct: boolean; misconception: string | null; message: string }

const TURNS = 5
const MAX_DIGITS = 3
const EDGES = ['length', 'width', 'height'] as const
const SMALLEST_EDGE = 1
const LARGEST_EDGE = 10

const COUNT_QUESTION = "How many cubes build this box? It's full inside."

const PANEL_BUTTON =
  'rounded-2xl px-6 font-display text-xl font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

const STEP_BUTTON =
  'w-16 rounded-2xl bg-white font-display text-3xl font-bold text-ink shadow-[0_4px_0_rgba(0,0,0,0.15)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/volume-builder/rounds?session_id=${getSessionId()}&learner_id=${getLearnerId()}`)
}

const sameBox = (first: Box, second: Box) => [...first].sort((a, b) => a - b).join() === [...second].sort((a, b) => a - b).join()

const times = (box: Box) => box.join(' × ')

/** The layer holding `cubes` cubes when it is one of them (top first), else the top layer. */
function layerHolding([length, width, height]: Box, cubes: number): Layer {
  if (length * height === cubes && length * width !== cubes) return 'front'
  if (width * height === cubes && length * width !== cubes) return 'side'
  return 'top'
}

/**
 * Volume Builder on the game table: a duel of five turns against Robo. Each turn the student counts the cubes in
 * a drawn box on the keypad, then builds a different box with the same number of cubes using the edge buttons;
 * each is graded once, and a wrong answer offers "Show me why": the hint, the diagnosed pattern and the box with
 * one layer shaded. "Robo's turn" then shows Robo counting its own box by layers and the box it built. One new
 * thing shows at a time; the page keeps the score. Nothing animates.
 */
function VolumeBuilderPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [dealing, setDealing] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [typed, setTyped] = useState('')
  const [edges, setEdges] = useState<Box>([1, 1, 1])
  const [building, setBuilding] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [roboShown, setRoboShown] = useState(false)
  const [turn, setTurn] = useState(1)
  const [myPoints, setMyPoints] = useState(0)
  const [roboPoints, setRoboPoints] = useState(0)
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
      setEdges(payload.visible_state.box)
      setLoadError(false)
      setMoveError(false)
      setTyped('')
      setBuilding(false)
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

  /** Deal the next turn's box; Next turn and Play again stay off until it arrives, so a double tap deals once. */
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
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't get a box of cubes — try again.</p>
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
        <p className="font-display text-2xl font-bold">Stacking the cubes...</p>
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

  const graded = (moveResult: MoveResult, kind: Result['kind'], message: string) => {
    playSound(moveResult.correct ? 'correct' : 'wrong')
    setState(moveResult.visible_state)
    setResult({ kind, correct: moveResult.correct, misconception: moveResult.misconception, message })
    if (moveResult.correct) setMyPoints((points) => points + 1)
    setProgress((p) => p && { ...p, correct_in_a_row: moveResult.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0 })
  }

  const pressDigit = (digit: string) => {
    playSound('tap')
    setTyped((current) => (current.length < MAX_DIGITS ? (current + digit).replace(/^0+(?=\d)/, '') : current))
  }

  const pressDelete = () => {
    playSound('tap')
    setTyped((current) => current.slice(0, -1))
  }

  const checkCount = () => {
    sendMove({ type: 'count', answer: Number(typed) }, (moveResult) => {
      const cubes = moveResult.visible_state.volume
      graded(moveResult, 'count', moveResult.correct ? `Right! This box has ${cubes} cubes.` : `Not quite — this box has ${cubes} cubes.`)
    })
  }

  const startBuilding = () => {
    playSound('tap')
    clearResult()
    setEdges(state.box)
    setBuilding(true)
  }

  const changeEdge = (index: number, change: number) => {
    playSound('tap')
    setEdges((current) => current.map((edge, at) => (at === index ? edge + change : edge)) as Box)
  }

  const checkBox = () => {
    sendMove({ type: 'build', box: edges }, (moveResult) => {
      const next = moveResult.visible_state
      graded(
        moveResult,
        'build',
        moveResult.correct
          ? `Right! ${times(edges)} = ${next.built_volume} cubes.`
          : `Not quite — your box holds ${next.built_volume} cubes, not ${next.volume}.`,
      )
    })
  }

  const showRobo = () => {
    playSound('tap')
    clearResult()
    setRoboShown(true)
    setRoboPoints((points) => points + 1 + (state.robo?.built ? 1 : 0))
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

  const counting = state.step === 'count'
  const target = state.volume ?? 0
  const robo = roboShown ? state.robo : null
  const shownBox: Box = robo ? robo.box : building && state.step === 'build' ? edges : (state.built ?? state.box)
  const shaded: Layer | undefined = robo
    ? 'top'
    : hint && result
      ? result.misconception === 'counted_one_layer'
        ? result.kind === 'count'
          ? layerHolding(state.box, state.count ?? 0)
          : layerHolding(shownBox, target)
        : 'top'
      : undefined
  const tooSame = sameBox(edges, state.box)
  const instruction = counting
    ? COUNT_QUESTION
    : building && state.step === 'build'
      ? `Build a different box with ${target} cubes.`
      : null
  const roboLines = robo && [
    `Robo counted ${robo.layer} cubes in the top layer and ${robo.layers} layers: ${robo.layers} × ${robo.layer} = ${robo.volume}.`,
    robo.built ? `Robo built a ${times(robo.built)} box with ${robo.volume} cubes too.` : `Robo couldn't find a different box with ${robo.volume} cubes.`,
  ]
  const spoken = finished ? duelOutcome(myPoints, roboPoints) : [instruction, result?.message, ...(roboLines ?? [])].filter(Boolean).join(' ')

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader
        left={<HomeButton />}
        right={
          <>
            <MuteToggle />
            <Link
              to="/summary"
              className="tap-target inline-flex items-center rounded-2xl px-2 font-display font-semibold text-ink-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2"
            >
              Session summary
            </Link>
          </>
        }
      />

      <main className="flex flex-1 flex-col items-center gap-4 px-4 pb-8">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <h1 className="font-display text-4xl font-bold">Volume Builder</h1>
          <ReadAloudButton text={spoken || COUNT_QUESTION} label="Read the instructions aloud" />
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          <div className="flex flex-col items-center gap-4">
            <DuelScoreLine unit="Turn" at={turn} of={TURNS} myPoints={myPoints} roboPoints={roboPoints} />
            {instruction && <p className="text-center font-display text-2xl font-semibold text-chalk">{instruction}</p>}

            <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-center md:justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-[260px] w-[280px] items-center justify-center">
                  <CubeBox box={shownBox} shaded={shaded} maxWidth={280} maxHeight={260} />
                </div>
                {building && state.step === 'build' && (
                  <p className="font-display text-2xl font-semibold text-chalk">{`Your box: ${times(edges)}`}</p>
                )}
              </div>

              <div
                aria-live="polite"
                className="flex w-full max-w-sm flex-col items-start gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 md:w-96"
              >
                {counting && (
                  <>
                    <p aria-label={`Your count: ${typed || 'empty'}`} className="font-display text-4xl font-bold">
                      <span className="inline-block min-w-24 border-b-4 border-ink text-center">{typed || ' '}</span> cubes
                    </p>
                    <Keypad onDigit={pressDigit} onDelete={pressDelete} onCheck={checkCount} checkDisabled={typed === '' || sending} />
                  </>
                )}

                {building && state.step === 'build' && (
                  <>
                    <div role="group" aria-label="Box edges" className="flex flex-col gap-2">
                      {EDGES.map((name, index) => (
                        <div key={name} className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-label={`Make the ${name} smaller`}
                            onClick={() => changeEdge(index, -1)}
                            disabled={edges[index] === SMALLEST_EDGE}
                            className={`tap-target ${STEP_BUTTON}`}
                          >
                            −
                          </button>
                          <p className="w-28 text-center font-display text-xl font-semibold">
                            {`${name[0].toUpperCase()}${name.slice(1)} `}
                            <span className="text-3xl font-bold">{edges[index]}</span>
                          </p>
                          <button
                            type="button"
                            aria-label={`Make the ${name} bigger`}
                            onClick={() => changeEdge(index, 1)}
                            disabled={edges[index] === LARGEST_EDGE}
                            className={`tap-target ${STEP_BUTTON}`}
                          >
                            +
                          </button>
                        </div>
                      ))}
                    </div>
                    {tooSame && <p className="font-semibold">That's the same box. Change an edge.</p>}
                    <button
                      type="button"
                      onClick={checkBox}
                      disabled={tooSame || sending}
                      className={`tap-target ${PANEL_BUTTON} bg-ink text-base disabled:opacity-40`}
                    >
                      Check my box
                    </button>
                  </>
                )}

                {result && (
                  <Verdict correct={result.correct}>
                    {result.message}
                  </Verdict>
                )}
                <HintPanel
                  wrong={Boolean(result && !result.correct)}
                  hint={hint}
                  hintError={hintError}
                  misconception={result?.misconception ?? null}
                  onShowWhy={() => showWhy(roundId)}
                />

                {state.step === 'build' && !building && (
                  <button type="button" onClick={startBuilding} className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}>
                    Build a box
                  </button>
                )}

                {roboLines && roboLines.map((line) => (
                  <p key={line} className="font-display text-xl font-semibold">
                    {line}
                  </p>
                ))}
                <DuelTurnButtons
                  roboDue={state.step === 'done' && !roboShown}
                  turnDone={Boolean(robo)}
                  lastTurn={turn === TURNS}
                  finished={finished}
                  nextLabel="Next turn"
                  dealing={dealing}
                  onRoboTurn={showRobo}
                  onNext={nextTurn}
                  onSeeWhoWon={() => setFinished(true)}
                />
                {finished && <DuelResult myPoints={myPoints} roboPoints={roboPoints} dealing={dealing} onPlayAgain={playAgain} />}
              </div>
            </div>
          </div>
        </GameTable>

        {moveError && <p className="font-display text-lg font-semibold text-alert-text">Couldn't send that — try again.</p>}
      </main>
    </div>
  )
}

export default VolumeBuilderPage
