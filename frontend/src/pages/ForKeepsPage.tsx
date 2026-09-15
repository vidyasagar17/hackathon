import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AnswerBox from '../components/AnswerBox'
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
import { columnEntryOrder } from '../answerEntry'
import { answerFill, chipColor, placeLetter } from '../columns'
import { formatMisconception } from '../format'
import { getSessionId } from '../session'
import { playSound } from '../sound'

type Hand = {
  my_cards: number[]
  robo_cards: number[]
  my_numbers: [number, number] | null
  my_answer: number | null
  difference: number | null
  my_kept: boolean | null
  robo_numbers: [number, number] | null
  robo_difference: number | null
  robo_kept: boolean | null
}

type VisibleState = {
  level: number
  hand_number: number
  step: 'arrange' | 'difference' | 'keep' | 'over'
  hands: Hand[]
  keep_choices: boolean[] | null
  keep_reason: string | null
  my_total: number
  robo_total: number
}

type RoundPayload = { round_id: string; visible_state: VisibleState; progress: Progress }

type MoveResult = { correct: boolean; misconception: string | null; visible_state: VisibleState }

type AnswerPlace = 'tens' | 'ones'

const HANDS = 4

/** Slots in the order cards fill them; the arrange move sends cards in this order. */
const SLOTS = [
  { number: 'Top', column: 'tens' },
  { number: 'Top', column: 'ones' },
  { number: 'Bottom', column: 'tens' },
  { number: 'Bottom', column: 'ones' },
] as const

const EMPTY_SLOTS: (number | null)[] = [null, null, null, null]

const ANSWER_PLACES: AnswerPlace[] = ['tens', 'ones']

/** The difference is written ones first, like the column method. */
const ENTRY_ORDER = columnEntryOrder(ANSWER_PLACES) as AnswerPlace[]

const EMPTY_ANSWER: Record<AnswerPlace, string> = { tens: '', ones: '' }

/** Shared look of the panel buttons; each tag still writes `tap-target` so `check:tap-targets` can see it. */
const PANEL_BUTTON = 'rounded-2xl px-6 font-display text-xl font-semibold'

function requestRound(): Promise<RoundPayload> {
  return postJson(`/curriculum/for-keeps/rounds?session_id=${getSessionId()}`)
}

function RoboCards({ cards }: { cards: number[] }) {
  return (
    <div role="group" aria-label={`Robo's cards: ${cards.join(', ')}`} className="flex items-center gap-4">
      <SeatName name="Robo" />
      <span aria-hidden="true" className="flex gap-2">
        {cards.map((digit, index) => (
          <PlayingCard key={index} digit={digit} />
        ))}
      </span>
    </div>
  )
}

/** Robo's finished hand in one row, so revealing it doesn't make the table taller. */
function RoboRevealed({ hand }: { hand: Hand }) {
  const [larger, smaller] = hand.robo_numbers as [number, number]
  const cards = (value: number) =>
    String(value)
      .split('')
      .map((digit, index) => <PlayingCard key={index} digit={digit} />)
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <SeatName name="Robo" />
      <span aria-label={`${larger} minus ${smaller}`} className="flex items-center gap-2">
        <span aria-hidden="true" className="flex gap-2">
          {cards(larger)}
        </span>
        <span aria-hidden="true" className="px-1 font-display text-5xl font-bold text-chalk">
          −
        </span>
        <span aria-hidden="true" className="flex gap-2">
          {cards(smaller)}
        </span>
      </span>
      <p className="font-display text-xl font-semibold text-chalk">
        {`Robo ${hand.robo_kept ? 'kept' : 'trashed'} ${hand.robo_difference}`}
      </p>
    </div>
  )
}

/** Slot `start` and `start + 1` of the arrangement: one two-digit number frame on card stock. */
function NumberFrame({
  start,
  slots,
  cards,
  onTapSlot,
  disabled,
}: {
  start: number
  slots: (number | null)[]
  cards: number[]
  onTapSlot: (slot: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex gap-2 rounded-2xl border-2 border-felt-edge bg-card p-2">
      {[start, start + 1].map((slotIndex) => {
        const { number, column } = SLOTS[slotIndex]
        const cardIndex = slots[slotIndex]
        const digit = cardIndex === null ? null : cards[cardIndex]
        return (
          <button
            key={slotIndex}
            type="button"
            aria-label={`${number} number ${column}: ${digit ?? 'empty'}`}
            onClick={() => onTapSlot(slotIndex)}
            disabled={digit === null || disabled}
            className={`tap-target relative flex h-24 w-16 items-center justify-center rounded-lg border-2 border-ink font-display text-5xl font-bold text-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hundreds ${digit === null ? answerFill[column] : chipColor[column]}`}
          >
            {digit}
            <span aria-hidden="true" className="absolute bottom-1 right-1.5 text-xs leading-none">
              {placeLetter[column]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function Arrangement({
  cards,
  slots,
  onTapCard,
  onTapSlot,
  disabled,
}: {
  cards: number[]
  slots: (number | null)[]
  onTapCard: (cardIndex: number) => void
  onTapSlot: (slot: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-end gap-2">
        <NumberFrame start={0} slots={slots} cards={cards} onTapSlot={onTapSlot} disabled={disabled} />
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="font-display text-5xl font-bold text-chalk">
            −
          </span>
          <NumberFrame start={2} slots={slots} cards={cards} onTapSlot={onTapSlot} disabled={disabled} />
        </div>
      </div>
      <div role="group" aria-label="Your cards" className="flex gap-3">
        {cards.map((digit, cardIndex) =>
          slots.includes(cardIndex) ? (
            <span
              key={cardIndex}
              aria-hidden="true"
              className="h-24 w-16 rounded-lg border-2 border-dashed border-chalk/60"
            />
          ) : (
            <button
              key={cardIndex}
              type="button"
              aria-label={`Card ${digit}`}
              onClick={() => onTapCard(cardIndex)}
              disabled={disabled}
              className="tap-target rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-hundreds"
            >
              <PlayingCard digit={digit} />
            </button>
          ),
        )}
      </div>
    </div>
  )
}

/** A two-digit number as playing cards, right-aligned so ones sit under ones. */
function NumberCards({ value }: { value: number }) {
  const digits = String(value).split('')
  return (
    <span className="flex justify-end gap-2">
      {digits.length === 1 && <span className="w-16" />}
      {digits.map((digit, index) => (
        <PlayingCard key={index} digit={digit} />
      ))}
    </span>
  )
}

function BuiltNumbers({ numbers }: { numbers: [number, number] }) {
  const [larger, smaller] = numbers
  return (
    <div aria-label={`${larger} minus ${smaller}`} className="flex flex-col items-end gap-2">
      <span aria-hidden="true">
        <NumberCards value={larger} />
      </span>
      <span aria-hidden="true" className="flex items-center gap-3">
        <span className="font-display text-5xl font-bold text-chalk">−</span>
        <NumberCards value={smaller} />
      </span>
    </div>
  )
}

/**
 * For Keeps on the game table: four hands; in each the student builds two 2-digit numbers from
 * four cards, finds the difference, and keeps or trashes it. Lowest total of two kept scores wins.
 * After the difference is checked, the verdict, the hint with its diagnosed pattern and every choice
 * sit in a fixed-width panel beside the numbers, so nothing the student needs falls below the table.
 * "Show me why" requests the hint only when pressed.
 */
function ForKeepsPage() {
  const [roundId, setRoundId] = useState<string | null>(null)
  const [state, setState] = useState<VisibleState | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [sending, setSending] = useState(false)
  const [moveError, setMoveError] = useState(false)
  const [slots, setSlots] = useState(EMPTY_SLOTS)
  const [answer, setAnswer] = useState(EMPTY_ANSWER)
  const [activePlace, setActivePlace] = useState<AnswerPlace | null>(null)
  const [result, setResult] = useState<MoveResult | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintError, setHintError] = useState(false)
  const [reviewing, setReviewing] = useState<number | null>(null)
  const hintRequest = useRef<AbortController | null>(null)

  /** Clear everything about the hand on screen, so the next hand starts fresh. */
  const clearHand = useCallback(() => {
    hintRequest.current?.abort()
    setMoveError(false)
    setSlots(EMPTY_SLOTS)
    setAnswer(EMPTY_ANSWER)
    setActivePlace(null)
    setResult(null)
    setHint(null)
    setHintError(false)
    setReviewing(null)
  }, [])

  const showRound = useCallback(
    (payload: RoundPayload) => {
      clearHand()
      setRoundId(payload.round_id)
      setState(payload.visible_state)
      setProgress(payload.progress)
      setLoadError(false)
    },
    [clearHand],
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

  /** After keep or trash the finished hand stays on screen until the student presses Next hand. */
  const shownIndex = reviewing ?? state.hand_number - 1
  const hand = state.hands[shownIndex]
  const arranging = state.step === 'arrange' && reviewing === null
  const showPanel = !arranging && state.step !== 'difference'
  const digits = ANSWER_PLACES.map((place) => answer[place])
  const firstTyped = digits.findIndex((digit) => digit !== '')
  const answerReady = firstTyped !== -1 && digits.slice(firstTyped).every((digit) => digit !== '')
  const currentPlace = activePlace ?? ENTRY_ORDER[0]

  const sendMove = (move: object, onDone: (moveResult: MoveResult) => void) => {
    setSending(true)
    setMoveError(false)
    postJson<MoveResult>(`/rounds/${roundId}/moves`, { move })
      .then(onDone)
      .catch(() => setMoveError(true))
      .finally(() => setSending(false))
  }

  const tapCard = (cardIndex: number) => {
    const slot = slots.indexOf(null)
    if (slot === -1) return
    playSound('tap')
    setSlots(slots.map((value, index) => (index === slot ? cardIndex : value)))
  }

  const tapSlot = (slot: number) => {
    playSound('tap')
    setSlots(slots.map((value, index) => (index === slot ? null : value)))
  }

  const arrange = () => {
    const cards = slots.map((cardIndex) => hand.my_cards[cardIndex as number])
    sendMove({ type: 'arrange', cards }, (moveResult) => setState(moveResult.visible_state))
  }

  const pressDigit = (digit: string) => {
    playSound('tap')
    setAnswer((current) => ({ ...current, [currentPlace]: digit }))
    const next = ENTRY_ORDER[ENTRY_ORDER.indexOf(currentPlace) + 1]
    if (next) setActivePlace(next)
  }

  const pressDelete = () => {
    playSound('tap')
    if (answer[currentPlace] !== '') {
      setAnswer((current) => ({ ...current, [currentPlace]: '' }))
      return
    }
    const previous = ENTRY_ORDER[ENTRY_ORDER.indexOf(currentPlace) - 1]
    if (!previous) return
    setAnswer((current) => ({ ...current, [previous]: '' }))
    setActivePlace(previous)
  }

  const checkDifference = () => {
    sendMove({ type: 'difference', answer: Number(digits.join('')) }, (moveResult) => {
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
  }

  const chooseKeep = (keep: boolean) => {
    const finishedIndex = state.hand_number - 1
    sendMove({ type: 'keep', keep }, (moveResult) => {
      setState(moveResult.visible_state)
      setReviewing(finishedIndex)
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

  const outcome =
    state.my_total < state.robo_total
      ? 'You win with the lower total!'
      : state.my_total > state.robo_total
        ? 'Robo wins with the lower total.'
        : "It's a tie!"

  const totals = `Kept totals: You ${state.my_total}, Robo ${state.robo_total}`

  const spoken = arranging
    ? `Hand ${state.hand_number} of ${HANDS}. Make two numbers with your four cards, then find the difference.`
    : state.step === 'difference'
      ? `Find the difference: ${hand.my_numbers?.[0]} minus ${hand.my_numbers?.[1]}.`
      : state.step === 'keep'
        ? `Keep your score of ${hand.difference}, or trash it.`
        : `${totals}.${state.step === 'over' ? ` ${outcome}` : ''}`

  const moveErrorText =
    state.step === 'arrange' && reviewing === null
      ? "Couldn't send your numbers — try again."
      : state.step === 'keep'
        ? "Couldn't send your choice — try again."
        : "Couldn't send your answer — try again."

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
          <h1 className="font-display text-4xl font-bold">For Keeps</h1>
          <ReadAloudButton text={spoken} label="Read the instructions aloud" />
        </div>

        <ProgressMeter progress={progress} canCelebrate />

        <GameTable>
          <div className="flex flex-col items-center gap-4">
            {reviewing !== null && hand.robo_numbers ? (
              <RoboRevealed hand={hand} />
            ) : (
              <RoboCards cards={hand.robo_cards} />
            )}
            <div className="flex flex-col items-center font-display text-chalk">
              <p className="flex flex-wrap justify-center gap-x-6 text-xl">
                <span className="font-semibold">{`Hand ${shownIndex + 1} of ${HANDS}`}</span>
                <span>{totals}</span>
              </p>
              {arranging && <p className="text-2xl font-semibold">Make two numbers with your cards.</p>}
              {state.step === 'difference' && <p className="text-2xl font-semibold">Find the difference.</p>}
              {state.step === 'keep' && <p className="text-2xl font-semibold">Keep this score or trash it?</p>}
            </div>
            <div className="flex w-full flex-col items-center gap-6 md:flex-row md:items-center md:justify-center">
              <div className="flex items-center gap-4">
                <SeatName name="You" />
                {arranging ? (
                  <Arrangement
                    cards={hand.my_cards}
                    slots={slots}
                    onTapCard={tapCard}
                    onTapSlot={tapSlot}
                    disabled={sending}
                  />
                ) : (
                  hand.my_numbers && (
                    <div className="flex flex-col items-end gap-3">
                      <BuiltNumbers numbers={hand.my_numbers} />
                      <div
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && answerReady && !sending) checkDifference()
                        }}
                        className="flex gap-2 rounded-2xl border-2 border-felt-edge bg-card p-2"
                      >
                        {ANSWER_PLACES.map((place) => (
                          <AnswerBox
                            key={place}
                            column={place}
                            value={answer[place]}
                            onChange={(value) => setAnswer((current) => ({ ...current, [place]: value }))}
                            active={state.step === 'difference' && place === currentPlace}
                            onSelect={() => setActivePlace(place)}
                            usesKeypad
                            disabled={state.step !== 'difference'}
                          />
                        ))}
                      </div>
                      {hand.my_kept !== null && (
                        <p className="font-display text-xl font-semibold text-chalk">
                          {`You ${hand.my_kept ? 'kept' : 'trashed'} ${hand.difference}`}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
              {state.step === 'difference' && (
                <Keypad
                  onDigit={pressDigit}
                  onDelete={pressDelete}
                  onCheck={checkDifference}
                  checkDisabled={!answerReady || sending}
                />
              )}
              {showPanel && (
                <div
                  aria-live="polite"
                  className="flex w-full max-w-xs flex-col items-start gap-3 rounded-2xl border-2 border-felt-edge bg-card p-4 md:w-80"
                >
                  {result && (
                    <p
                      className={`font-display text-2xl font-bold ${result.correct ? 'text-success-text' : 'text-alert-text'}`}
                    >
                      {result.correct ? 'Correct!' : `Not quite — the difference is ${hand.difference}.`}
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
                      <ReadAloudButton text={hint} label="Read the hint aloud" />
                      {result.misconception && (
                        <p className="text-sm text-ink-muted">
                          Diagnosed pattern: {formatMisconception(result.misconception)}
                        </p>
                      )}
                    </div>
                  )}
                  {state.step === 'keep' && (
                    <>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => chooseKeep(true)}
                          disabled={sending || !state.keep_choices?.includes(true)}
                          className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink disabled:opacity-40`}
                        >
                          Keep it
                        </button>
                        <button
                          type="button"
                          onClick={() => chooseKeep(false)}
                          disabled={sending || !state.keep_choices?.includes(false)}
                          className={`tap-target ${PANEL_BUTTON} border-4 border-ink bg-white text-ink disabled:opacity-40`}
                        >
                          Trash it
                        </button>
                      </div>
                      {state.keep_reason && <p className="font-display text-lg font-semibold">{state.keep_reason}</p>}
                    </>
                  )}
                  {reviewing !== null && state.step !== 'over' && (
                    <button type="button" onClick={clearHand} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                      Next hand
                    </button>
                  )}
                  {state.step === 'over' && (
                    <>
                      <p className="font-display text-2xl font-bold">{outcome}</p>
                      <button type="button" onClick={retry} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
                        Play again
                      </button>
                    </>
                  )}
                  {moveError && <p className="font-semibold text-alert-text">{moveErrorText}</p>}
                </div>
              )}
            </div>
            {arranging && (
              <button
                type="button"
                onClick={arrange}
                disabled={sending || slots.includes(null)}
                className="tap-target rounded-2xl bg-hundreds px-8 font-display text-xl font-semibold text-ink disabled:opacity-60"
              >
                Make these numbers
              </button>
            )}
          </div>
        </GameTable>

        {moveError && !showPanel && (
          <p className="font-display text-lg font-semibold text-alert-text">{moveErrorText}</p>
        )}

      </main>
    </div>
  )
}

export default ForKeepsPage
