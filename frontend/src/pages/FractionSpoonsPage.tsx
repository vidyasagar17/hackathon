import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import FractionBars from '../components/FractionBars'
import FractionCard from '../components/FractionCard'
import GameTable from '../components/GameTable'
import HintPanel from '../components/HintPanel'
import HomeButton from '../components/HomeButton'
import MuteToggle from '../components/MuteToggle'
import ProgressMeter, { type Progress } from '../components/ProgressMeter'
import ReadAloudButton from '../components/ReadAloudButton'
import SeatName from '../components/SeatName'
import { postJson } from '../api'
import { useRoundHint } from '../roundHint'
import { getSessionId } from '../session'
import { playSound } from '../sound'

type Fraction = { top: number; bottom: number }

type Step = 'collect' | 'draw' | 'fit' | 'discard' | 'choose' | 'robo' | 'over'

type VisibleState = {
  level: number
  hand_number: number
  step: Step
  my_cards: Fraction[]
  collecting: Fraction | null
  drawn: Fraction | null
  trash_top: Fraction | null
  pile_count: number
  my_spoons: number
  robo_spoons: number
  can_claim: boolean
  robo_discard: Fraction | null
  robo_spoon_cards: Fraction[] | null
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

/** `cards` are the Collecting card and the card a diagnosed hint compares it with; null for the general hint. */
/** A graded fit tap or claim as shown on the panel; the message keeps the cards the move was about. */
type Result = { correct: boolean; misconception: string | null; message: string }

const HAND_SIZE = 4

const INSTRUCTIONS: Partial<Record<Step, string>> = {
  collect: 'Tap the card you want to collect.',
  draw: 'Draw a card.',
  discard: 'Tap a card to throw away.',
}

/** Shared look of the panel buttons; each tag still writes `tap-target` so `check:tap-targets` can see it. */
const PANEL_BUTTON = 'rounded-2xl px-6 font-display text-xl font-semibold'

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/fraction-spoons/rounds?session_id=${getSessionId()}`)
}

function fractionText(fraction: Fraction): string {
  return `${fraction.top}/${fraction.bottom}`
}

function sameFace(first: Fraction, second: Fraction): boolean {
  return first.top === second.top && first.bottom === second.bottom
}

/**
 * A face-down card: Robo's hand and the pile never show their fractions.
 *
 * Robo's cards are `small` (64×44) so the whole table fits a 768 px tall tablet; the pile stays full size.
 */
function CardBack({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-lg border-4 border-card bg-felt-edge shadow-[0_4px_0_#163A34] ${small ? 'h-16 w-11' : 'h-24 w-16'}`}
    />
  )
}

function RoboSeat() {
  return (
    <div role="group" aria-label={`Robo has ${HAND_SIZE} cards`} className="flex items-center gap-4">
      <SeatName name="Robo" />
      <span className="flex gap-2">
        {Array.from({ length: HAND_SIZE }, (_, index) => (
          <CardBack key={index} small />
        ))}
      </span>
    </div>
  )
}

/** What Robo just did: the set it won a spoon with, or on the student's next turn, the card it threw away. */
function RoboNews({ state }: { state: VisibleState }) {
  if (state.robo_spoon_cards) {
    return (
      <div role="group" aria-label="Robo's spoon" className="flex flex-col items-center gap-2">
        <span className="flex gap-2">
          {state.robo_spoon_cards.map((card, index) => (
            <FractionCard key={index} {...card} />
          ))}
        </span>
        <p className="font-display text-xl font-semibold text-chalk">
          {`Robo took the spoon with ${state.robo_spoon_cards.map(fractionText).join(', ')}.`}
        </p>
      </div>
    )
  }
  if (state.robo_discard && (state.step === 'collect' || state.step === 'draw')) {
    return (
      <p className="font-display text-xl font-semibold text-chalk">
        {`Robo drew a card and threw away ${fractionText(state.robo_discard)}.`}
      </p>
    )
  }
  return null
}

function Pile({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <CardBack />
      <p className="font-display text-lg font-semibold text-chalk">
        {count === 1 ? '1 card in the pile' : `${count} cards in the pile`}
      </p>
    </div>
  )
}

function Trash({ top }: { top: Fraction | null }) {
  if (!top) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span aria-hidden="true" className="block h-24 w-16 rounded-lg border-2 border-dashed border-chalk" />
        <p className="font-display text-lg font-semibold text-chalk">The trash is empty</p>
      </div>
    )
  }
  return (
    <div role="group" aria-label="Top of the trash" className="flex flex-col items-center gap-2">
      <FractionCard {...top} />
      <p className="font-display text-lg font-semibold text-chalk">Trash</p>
    </div>
  )
}

/** The drawn card; at the discard step it is a button, since it can be the card thrown away. */
function DrawnCard({
  card,
  discardable,
  disabled,
  onDiscard,
}: {
  card: Fraction
  discardable: boolean
  disabled: boolean
  onDiscard: () => void
}) {
  return (
    <div role="group" aria-label="You drew" className="flex flex-col items-center gap-2">
      {discardable ? (
        <button
          type="button"
          aria-label={fractionText(card)}
          onClick={onDiscard}
          disabled={disabled}
          className="tap-target rounded-lg disabled:cursor-default"
        >
          <FractionCard {...card} />
        </button>
      ) : (
        <FractionCard {...card} />
      )}
      <p className="font-display text-lg font-semibold text-chalk">You drew</p>
    </div>
  )
}

function FractionSpoonsPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const { hint, cards: hintCards, hintError, showWhy, clearHint } = useRoundHint<[Fraction, Fraction]>()

  /** Clear the last graded move's result and hint, so the next move starts fresh. */
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

  const retry = () => {
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
            onClick={retry}
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

  const collectingIndex = state.collecting
    ? state.my_cards.findIndex((card) => sameFace(card, state.collecting as Fraction))
    : -1
  const canCollect = (state.step === 'collect' || state.step === 'draw') && !sending
  const canDiscard = state.step === 'discard' && !sending
  const asking = state.step === 'fit' && state.drawn !== null && state.collecting !== null
  const choosing = state.step === 'choose'
  const over = state.step === 'over'
  const instruction = asking
    ? `Does ${fractionText(state.drawn as Fraction)} fit with your ${fractionText(state.collecting as Fraction)}?`
    : choosing
      ? state.can_claim
        ? 'Take the spoon if all four cards are equal, or let Robo take its turn.'
        : 'Let Robo take its turn.'
      : INSTRUCTIONS[state.step]
  const outcome =
    state.my_spoons > state.robo_spoons
      ? `You win the game ${state.my_spoons}–${state.robo_spoons}!`
      : `Robo wins the game ${state.robo_spoons}–${state.my_spoons}.`
  const spoken = over ? outcome : instruction
  const showPanel = asking || result !== null || choosing || over

  const sendMove = (move: object, onDone?: (moveResult: MoveResult) => void) => {
    setSending(true)
    setMoveError(false)
    postJson<MoveResult>(`/rounds/${roundId}/moves`, { move })
      .then((moveResult) => {
        setState(moveResult.visible_state)
        onDone?.(moveResult)
      })
      .catch(() => setMoveError(true))
      .finally(() => setSending(false))
  }

  const updateStars = (correct: boolean) => {
    setProgress(
      (p) =>
        p && {
          ...p,
          correct_in_a_row: correct ? Math.min(p.correct_in_a_row + 1, p.needed) : 0,
        },
    )
  }

  const collect = (index: number) => {
    playSound('tap')
    clearResult()
    sendMove({ type: 'collect', card: index })
  }

  const draw = () => {
    playSound('tap')
    clearResult()
    sendMove({ type: 'draw' })
  }

  const answerFit = (fits: boolean) => {
    const drawn = fractionText(state.drawn as Fraction)
    const collecting = fractionText(state.collecting as Fraction)
    sendMove({ type: 'fit', fits }, (moveResult) => {
      playSound(moveResult.correct ? 'correct' : 'wrong')
      const actuallyFits = moveResult.correct === fits
      setResult({
        correct: moveResult.correct,
        misconception: moveResult.misconception,
        message: `${moveResult.correct ? 'Right' : 'Not quite'} — ${drawn} ${actuallyFits ? 'fits' : "doesn't fit"} with ${collecting}.`,
      })
      updateStars(moveResult.correct)
    })
  }

  /**
   * Position 0-3 is one of the student's cards; position 4 is the drawn card. Clears the fit result and
   * hint, so the choice panel holds only its two buttons and fits a 768 px tall tablet.
   */
  const discard = (position: number) => {
    playSound('tap')
    clearResult()
    sendMove({ type: 'discard', card: position })
  }

  const claim = () => {
    const collecting = fractionText(state.collecting as Fraction)
    clearResult()
    sendMove({ type: 'claim' }, (moveResult) => {
      playSound(moveResult.correct ? 'correct' : 'wrong')
      setResult({
        correct: moveResult.correct,
        misconception: moveResult.misconception,
        message: moveResult.correct ? 'You took the spoon!' : `Not quite — not all four cards are equal to ${collecting}.`,
      })
      updateStars(moveResult.correct)
    })
  }

  const roboTurn = () => {
    playSound('tap')
    clearResult()
    sendMove({ type: 'robo_turn' })
  }

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
          <h1 className="font-display text-4xl font-bold">Fraction Spoons</h1>
          {spoken && <ReadAloudButton text={spoken} label="Read the instructions aloud" />}
          <ProgressMeter progress={progress} canCelebrate />
        </div>

        <GameTable>
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <RoboSeat />
              <div className="flex flex-wrap items-start justify-center gap-8">
                <Pile count={state.pile_count} />
                <Trash top={state.trash_top} />
                {state.drawn && (
                  <DrawnCard
                    card={state.drawn}
                    discardable={state.step === 'discard'}
                    disabled={!canDiscard}
                    onDiscard={() => discard(HAND_SIZE)}
                  />
                )}
              </div>
            </div>
            <RoboNews state={state} />
            <div className="flex flex-col items-center gap-1 font-display text-chalk">
              <p className="flex flex-wrap justify-center gap-x-6 text-xl font-semibold">
                <span>{`Hand ${state.hand_number}`}</span>
                <span>{`Spoons: You ${state.my_spoons}, Robo ${state.robo_spoons}`}</span>
              </p>
              {instruction && <p className="text-2xl font-semibold">{instruction}</p>}
            </div>
            <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-start md:justify-center">
              <div role="group" aria-label="Your cards" className="flex flex-wrap items-start justify-center gap-4">
                {state.my_cards.map((card, index) => (
                  <div key={index} className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      aria-label={fractionText(card)}
                      aria-pressed={index === collectingIndex}
                      disabled={!(canCollect || canDiscard)}
                      onClick={() => (state.step === 'discard' ? discard(index) : collect(index))}
                      className={`tap-target rounded-lg disabled:cursor-default ${
                        index === collectingIndex ? 'ring-4 ring-hundreds ring-offset-4 ring-offset-felt' : ''
                      }`}
                    >
                      <FractionCard {...card} />
                    </button>
                    <span className="h-7 font-display text-lg font-semibold text-chalk">
                      {index === collectingIndex ? 'Collecting' : ''}
                    </span>
                  </div>
                ))}
              </div>
              {showPanel && (
                <div
                  aria-live="polite"
                  className="flex w-full max-w-xs flex-col items-start gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 md:w-80"
                >
                  {asking && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => answerFit(true)}
                        disabled={sending}
                        className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}
                      >
                        Fits
                      </button>
                      <button
                        type="button"
                        onClick={() => answerFit(false)}
                        disabled={sending}
                        className={`tap-target ${PANEL_BUTTON} border-4 border-ink bg-white text-ink`}
                      >
                        Doesn't fit
                      </button>
                    </div>
                  )}
                  {result && (
                    <p
                      className={`font-display text-2xl font-bold ${result.correct ? 'text-success-text' : 'text-alert-text'}`}
                    >
                      {result.message}
                    </p>
                  )}
                  <HintPanel
                    wrong={Boolean(result && !result.correct)}
                    hint={hint}
                    hintError={hintError}
                    misconception={result?.misconception ?? null}
                    onShowWhy={() => showWhy(roundId)}
                    picture={hintCards && <FractionBars cards={hintCards} />}
                  />
                  {choosing && (
                    <div className="flex flex-wrap gap-3">
                      {state.can_claim && (
                        <button
                          type="button"
                          onClick={claim}
                          disabled={sending}
                          className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}
                        >
                          Take the spoon
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={roboTurn}
                        disabled={sending}
                        className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}
                      >
                        Robo's turn
                      </button>
                    </div>
                  )}
                  {over && (
                    <>
                      <p className="font-display text-2xl font-bold">{outcome}</p>
                      <button type="button" onClick={retry} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                        Play again
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {state.step === 'draw' && (
              <button
                type="button"
                onClick={draw}
                disabled={sending}
                className="tap-target rounded-2xl bg-card px-6 font-display text-xl font-semibold text-ink"
              >
                Draw a card
              </button>
            )}
          </div>
        </GameTable>

        {moveError && (
          <p className="font-display text-xl font-bold text-alert-text">Couldn't send your move — try again.</p>
        )}
      </main>
    </div>
  )
}

export default FractionSpoonsPage
