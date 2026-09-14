import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import HomeButton from '../components/HomeButton'
import HundredthsGrid from '../components/HundredthsGrid'
import LightbulbIcon from '../components/LightbulbIcon'
import MuteToggle from '../components/MuteToggle'
import PlayerToken from '../components/PlayerToken'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import RoboAvatar from '../components/RoboAvatar'
import { API_URL } from '../api'
import { formatMisconception } from '../format'
import { getSessionId } from '../session'
import { playSound } from '../sound'

type Pick = 'mine' | 'robo' | 'same'

type VisibleState = {
  level: number
  mine: string
  robo: string
  choices: Pick[]
  pick: Pick | null
  correct_pick: Pick | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

function postJson<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  }).then((res) => {
    if (!res.ok) throw new Error(`Request to ${path} failed`)
    return res.json()
  })
}

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/decimal-war/rounds?session_id=${getSessionId()}`)
}

/** Decimal places in card order. Their colors are never the whole-number colors, so tens and tenths can't be confused. */
const DECIMAL_PLACES = [
  { name: 'tenths', letter: 't', band: 'bg-tenths' },
  { name: 'hundredths', letter: 'h', band: 'bg-hundredths' },
  { name: 'thousandths', letter: 'th', band: 'bg-thousandths' },
]

/** A number drawn as its digit cards after "0.", so the number of cards is the number of decimal places. */
function DigitCards({ value }: { value: string }) {
  const digits = value.slice(2).split('')
  return (
    <span aria-hidden="true" className="flex items-end gap-2">
      <span className="pb-1 font-display text-5xl font-bold text-chalk">0.</span>
      {digits.map((digit, index) => (
        <span
          key={index}
          className="relative flex h-24 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-felt-edge bg-card pb-4 font-display text-5xl font-bold text-ink shadow-[0_4px_0_#163A34]"
        >
          <span className="absolute left-1.5 top-1 text-sm leading-none">{digit}</span>
          {digit}
          <span
            data-place={DECIMAL_PLACES[index].name}
            className={`absolute inset-x-0 bottom-0 flex h-5 items-center justify-center font-body text-xs font-bold leading-none text-ink ${DECIMAL_PLACES[index].band}`}
          >
            {DECIMAL_PLACES[index].letter}
          </span>
        </span>
      ))}
    </span>
  )
}

function Seat({
  label,
  name,
  value,
  onPick,
  disabled,
  isAnswer,
  isPick,
}: {
  label: string
  name: 'You' | 'Robo'
  value: string
  onPick: () => void
  disabled: boolean
  isAnswer: boolean
  isPick: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPick}
      disabled={disabled}
      className={`tap-target grid w-full grid-cols-1 items-center gap-3 rounded-3xl border-4 px-5 py-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hundreds sm:grid-cols-[6rem_1fr_6rem] ${isAnswer ? 'border-hundreds' : 'border-chalk/60'}`}
    >
      <span className="flex flex-col items-center gap-1 font-display text-xl font-semibold text-chalk">
        {name === 'Robo' ? <RoboAvatar /> : <PlayerToken />}
        {name}
      </span>
      <span className="flex items-center justify-center gap-4">
        <DigitCards value={value} />
        <span className="flex w-24 flex-col items-start gap-2 font-display text-base font-bold">
          {isAnswer && <span className="rounded-full bg-hundreds px-3 py-1 text-ink">Larger</span>}
          {isPick && <span className="rounded-full border-2 border-chalk px-3 py-0.5 text-chalk">Your pick</span>}
        </span>
      </span>
      <span aria-hidden="true" className="hidden sm:block" />
    </button>
  )
}

/**
 * Decimal War on the game table: the student judges whose decimal is larger, one pick per round.
 * A wrong pick offers "Show me why"; the hint is requested only when the student presses it.
 */
function DecimalWarPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [result, setResult] = useState<MoveResult | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintError, setHintError] = useState(false)
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

  const nextRound = () => {
    requestRound()
      .then(showRound)
      .catch(() => setLoadError(true))
  }

  const pick = (choice: Pick) => {
    setSending(true)
    setMoveError(false)
    postJson<MoveResult>(`/rounds/${roundId}/moves`, { move: { pick: choice } })
      .then((moveResult) => {
        playSound(moveResult.correct ? 'correct' : 'wrong')
        setResult(moveResult)
        setState(moveResult.visible_state)
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

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col bg-base">
        <AppHeader left={<HomeButton />} right={<MuteToggle />} />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't deal a round — try again.</p>
          <button
            type="button"
            onClick={nextRound}
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

  const judged = result !== null
  const offersSame = state.choices.includes('same')
  const larger = state.correct_pick === 'mine' ? state.mine : state.robo
  const places = Math.max(state.mine.length, state.robo.length) - 2
  const verdict = result?.correct
    ? 'Correct!'
    : state.correct_pick === 'same'
      ? "Not quite — they're the same size."
      : `Not quite — ${larger} is larger.`
  const spoken = offersSame
    ? `Which is larger, ${state.mine} or ${state.robo}? Or are they the same?`
    : `Which number is larger, ${state.mine} or ${state.robo}?`

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
          <h1 className="font-display text-4xl font-bold">Decimal War</h1>
          <ReadAloudButton text={spoken} label="Read the question aloud" />
        </div>

        <ProgressMeter progress={progress} canCelebrate />

        <section
          aria-label="Game table"
          className="w-full max-w-3xl rounded-[2rem] border-[12px] border-felt-edge bg-felt p-4 sm:p-6"
        >
          <div className="flex flex-col gap-3">
            <Seat
              label={`Robo's number, ${state.robo}`}
              name="Robo"
              value={state.robo}
              onPick={() => pick('robo')}
              disabled={sending || judged}
              isAnswer={judged && state.correct_pick === 'robo'}
              isPick={judged && state.pick === 'robo'}
            />
            <p className="py-1 text-center font-display text-2xl font-semibold text-chalk">
              {offersSame ? 'Which is larger, or are they the same?' : 'Which number is larger?'}
            </p>
            <Seat
              label={`Your number, ${state.mine}`}
              name="You"
              value={state.mine}
              onPick={() => pick('mine')}
              disabled={sending || judged}
              isAnswer={judged && state.correct_pick === 'mine'}
              isPick={judged && state.pick === 'mine'}
            />
            {offersSame && (
              <button
                type="button"
                onClick={() => pick('same')}
                disabled={sending || judged}
                className={`tap-target self-center rounded-2xl border-4 px-6 font-display text-xl font-semibold text-chalk focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hundreds ${judged && state.correct_pick === 'same' ? 'border-hundreds' : 'border-chalk/60'}`}
              >
                They're the same
              </button>
            )}
          </div>
        </section>

        {moveError && (
          <p className="font-display text-lg font-semibold text-alert-text">
            Couldn't send your pick — try again.
          </p>
        )}

        {result && (
          <section
            aria-live="polite"
            className="flex w-full max-w-3xl flex-col gap-3 rounded-2xl border-2 border-felt-edge bg-card p-5"
          >
            <p
              className={`font-display text-2xl font-bold ${result.correct ? 'text-success-text' : 'text-alert-text'}`}
            >
              {verdict}
            </p>

            {!result.correct && hint === null && (
              <button
                type="button"
                onClick={showWhy}
                className="tap-target inline-flex items-center gap-2 self-start rounded-2xl border-4 border-ink bg-white px-4 font-display text-lg font-semibold text-ink"
              >
                <LightbulbIcon />
                Show me why
              </button>
            )}
            {hintError && (
              <p className="font-semibold text-alert-text">Couldn't load the hint — try again.</p>
            )}
            {hint && (
              <div className="flex flex-col items-start gap-2">
                <div className="flex flex-wrap gap-6">
                  <HundredthsGrid digits={state.mine.slice(2)} places={places} />
                  <HundredthsGrid digits={state.robo.slice(2)} places={places} />
                </div>
                <p className="text-lg">{hint}</p>
                <ReadAloudButton text={hint} label="Read the hint aloud" />
                {result.misconception && (
                  <p className="text-sm text-ink-muted">
                    Diagnosed pattern: {formatMisconception(result.misconception)}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={nextRound}
              className="tap-target self-end rounded-2xl bg-ink px-8 font-display text-xl font-semibold text-base"
            >
              Next round
            </button>
          </section>
        )}
      </main>
    </div>
  )
}

export default DecimalWarPage
