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

type GameId = 'addition-war' | 'take-away-war'

type Operation = 'add' | 'take_away'

type Winner = 'mine' | 'robo' | 'same'

type Cards = [number, number]

type VisibleState = {
  operation: Operation
  level: number
  step: 'answer' | 'winner' | 'done'
  mine: Cards
  robo: Cards
  robo_total: number
  choices: number[]
  answer_pick: number | null
  my_total: number | null
  winner_pick: Winner | null
  winner: Winner | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

type PickResult = 'right' | 'picked-wrong' | undefined

const GAMES: Record<GameId, { title: string; question: string }> = {
  'addition-war': { title: 'Addition War', question: 'How many in all?' },
  'take-away-war': { title: 'Take-Away War', question: 'How many are left?' },
}

const WINNER_BUTTONS: { pick: Winner; label: string }[] = [
  { pick: 'mine', label: 'You' },
  { pick: 'robo', label: 'Robo' },
  { pick: 'same', label: 'Same' },
]

const RESULTS: Record<Winner, string> = {
  mine: 'You win!',
  robo: 'Robo wins.',
  same: "Same! It's a tie.",
}

/** Cards in reading order: as dealt for adding; bigger card first for taking away, as in Subtraction Top-It. */
function readingOrder(cards: Cards, operation: Operation): Cards {
  return operation === 'add' ? cards : [Math.max(...cards), Math.min(...cards)]
}

function instruction(state: VisibleState): string {
  const [first, second] = readingOrder(state.mine, state.operation)
  return state.operation === 'add'
    ? `You have ${first} and ${second}. Tap how many in all.`
    : `You have ${first} and ${second}. Take ${second} away from ${first}. Tap how many are left.`
}

function whoHasMore(state: VisibleState): string {
  return `You have ${state.my_total} and Robo has ${state.robo_total}. Who has more?`
}

function resultSpoken(state: VisibleState): string {
  return `You have ${state.my_total}. Robo has ${state.robo_total}. ${RESULTS[state.winner as Winner]}`
}

function pickResult<T>(option: T, pick: T | null, right: T | null): PickResult {
  if (pick === null) return undefined
  if (option === right) return 'right'
  return option === pick ? 'picked-wrong' : undefined
}

function requestRound(game: GameId): Promise<RoundPayload> {
  return postJson(`/curriculum/${game}/rounds?session_id=${getSessionId()}&learner_id=${getLearnerId()}`)
}

function Hand({
  name,
  cards,
  operation,
  message,
}: {
  name: 'You' | 'Robo'
  cards: Cards
  operation: Operation
  message?: string
}) {
  const [first, second] = readingOrder(cards, operation)
  const word = operation === 'add' ? 'plus' : 'take away'
  return (
    <div className="flex items-center gap-4">
      <SeatName name={name} message={message} />
      <span
        aria-label={`${name === 'You' ? 'Your' : "Robo's"} cards: ${first} ${word} ${second}`}
        className="flex items-center gap-3"
      >
        <span aria-hidden="true">
          <PlayingCard digit={first} />
        </span>
        <span aria-hidden="true" className="font-display text-5xl font-bold text-chalk">
          {operation === 'add' ? '+' : '−'}
        </span>
        <span aria-hidden="true">
          <PlayingCard digit={second} />
        </span>
      </span>
    </div>
  )
}

/**
 * Addition War and Take-Away War for grades K–1: card and picture taps only, each step's words spoken
 * automatically once the browser allows it, and gentle feedback — a wrong pick wobbles and the right one
 * is outlined, with no red text. One try per hand; a wrong answer's counting hint is shown and spoken.
 */
function CardWarPage({ game }: { game: GameId }) {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const cardRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const winnerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const hintRequest = useRef<AbortController | null>(null)

  const showRound = useCallback((payload: RoundPayload) => {
    hintRequest.current?.abort()
    setRoundId(payload.round_id)
    setState(payload.visible_state)
    setProgress(payload.progress)
    setLoadError(false)
    setMoveError(false)
    setHint(null)
    speakWhenAllowed(instruction(payload.visible_state))
  }, [])

  useEffect(() => {
    let stale = false
    requestRound(game)
      .then((payload) => {
        if (!stale) showRound(payload)
      })
      .catch(() => {
        if (!stale) setLoadError(true)
      })
    return () => {
      stale = true
    }
  }, [game, showRound])

  const dealNext = () => {
    requestRound(game)
      .then(showRound)
      .catch(() => setLoadError(true))
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col bg-base">
        <AppHeader left={<HomeButton />} right={<MuteToggle />} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't deal the cards — try again.</p>
          <button
            type="button"
            onClick={dealNext}
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
        <p className="font-display text-2xl font-bold">Dealing cards...</p>
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

  const fetchHintThenAsk = (answered: VisibleState) => {
    hintRequest.current?.abort()
    const request = new AbortController()
    hintRequest.current = request
    postJson<{ hint: string | null }>(`/rounds/${roundId}/hint`, undefined, request.signal)
      .then((reply) => {
        setHint(reply.hint)
        speakWhenAllowed(reply.hint ? `${reply.hint} ${whoHasMore(answered)}` : whoHasMore(answered))
      })
      .catch(() => {
        if (!request.signal.aborted) speakWhenAllowed(whoHasMore(answered))
      })
  }

  const pickAnswer = (pick: number) => {
    sendMove({ type: 'answer', pick }, (result) => {
      playSound(result.correct ? 'correct' : 'wrong')
      setState(result.visible_state)
      setProgress(
        (p) =>
          p && {
            ...p,
            correct_in_a_row: result.correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0,
          },
      )
      if (result.correct) {
        speakWhenAllowed(whoHasMore(result.visible_state))
      } else {
        wobble(cardRefs.current[pick])
        fetchHintThenAsk(result.visible_state)
      }
    })
  }

  const pickWinner = (pick: Winner) => {
    sendMove({ type: 'winner', pick }, (result) => {
      playSound(result.correct ? 'correct' : 'wrong')
      setState(result.visible_state)
      if (!result.correct) wobble(winnerRefs.current[pick])
      speakWhenAllowed(resultSpoken(result.visible_state))
    })
  }

  const { title, question } = GAMES[game]
  const spoken =
    state.step === 'answer'
      ? instruction(state)
      : state.step === 'winner'
        ? hint
          ? `${hint} ${whoHasMore(state)}`
          : whoHasMore(state)
        : resultSpoken(state)

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader left={<HomeButton />} right={<MuteToggle />} />

      <main className="flex flex-1 flex-col items-center gap-4 px-4 pb-8">
        <h1 className="font-display text-4xl font-bold">{title}</h1>

        <ProgressMeter progress={progress} canCelebrate />

        <GameTable>
          <div className="flex flex-col items-center gap-5">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Hand
                name="Robo"
                cards={state.robo}
                operation={state.operation}
                message={`I have ${state.robo_total}!`}
              />
            </div>

            <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
              <div className="flex flex-col items-center gap-5">
                <Hand name="You" cards={state.mine} operation={state.operation} />

                <div className="flex flex-wrap items-center justify-center gap-4">
                  <p className="font-display text-3xl font-bold text-chalk">
                    {state.step === 'answer'
                      ? question
                      : state.step === 'winner'
                        ? 'Who has more?'
                        : RESULTS[state.winner as Winner]}
                  </p>
                  <ReadAloudButton text={spoken} label="Hear it again" />
                </div>

                <div role="group" aria-label="Answer cards" className="flex flex-wrap justify-center gap-4">
                  {state.choices.map((choice) => {
                    const result = pickResult(choice, state.answer_pick, state.my_total)
                    return (
                      <button
                        key={choice}
                        ref={(element) => {
                          cardRefs.current[choice] = element
                        }}
                        type="button"
                        aria-label={`Answer ${choice}${result === 'right' ? ', the right answer' : ''}`}
                        data-result={result}
                        onClick={() => pickAnswer(choice)}
                        disabled={sending || state.step !== 'answer'}
                        className={`tap-target rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hundreds ${result === 'right' ? 'ring-8 ring-hundreds' : ''}`}
                      >
                        <PlayingCard digit={choice} />
                      </button>
                    )
                  })}
                </div>

                {state.my_total !== null && (
                  <p className="font-display text-2xl font-semibold text-chalk">{`You have ${state.my_total}`}</p>
                )}
              </div>

              {state.step !== 'answer' && (
                <div className="flex w-full max-w-xs flex-col items-center gap-4 md:w-80">
                  {hint && (
                    <p className="w-full rounded-2xl border-2 border-felt-edge bg-card p-4 text-xl text-ink">{hint}</p>
                  )}

                  <div role="group" aria-label="Who has more?" className="grid w-full grid-cols-3 gap-3">
                    {WINNER_BUTTONS.map(({ pick, label }) => {
                      const result = pickResult(pick, state.winner_pick, state.winner)
                      return (
                        <button
                          key={pick}
                          ref={(element) => {
                            winnerRefs.current[pick] = element
                          }}
                          type="button"
                          aria-label={label}
                          data-result={result}
                          onClick={() => pickWinner(pick)}
                          disabled={sending || state.step !== 'winner'}
                          className={`tap-target flex flex-col items-center justify-center gap-1 rounded-2xl border-4 px-2 py-3 font-display text-2xl font-bold text-chalk focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hundreds ${result === 'right' ? 'border-hundreds ring-4 ring-hundreds' : 'border-chalk/60'}`}
                        >
                          {pick === 'mine' ? (
                            <PlayerToken />
                          ) : pick === 'robo' ? (
                            <RoboAvatar />
                          ) : (
                            <span aria-hidden="true" className="text-5xl leading-none">
                              =
                            </span>
                          )}
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  {state.step === 'done' && (
                    <button
                      type="button"
                      aria-label="Next hand"
                      onClick={dealNext}
                      className="tap-target flex items-center gap-3 rounded-2xl bg-hundreds px-10 font-display text-2xl font-bold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-chalk focus-visible:ring-offset-2 focus-visible:ring-offset-felt"
                    >
                      Next
                      <NextArrow />
                    </button>
                  )}
                </div>
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

export default CardWarPage
