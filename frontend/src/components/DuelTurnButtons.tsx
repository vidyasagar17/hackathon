/** Shared look of the panel buttons; each tag still writes `tap-target` so `check:tap-targets` can see it. */
const PANEL_BUTTON =
  'rounded-2xl px-6 font-display text-xl font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

/**
 * The end of a duel turn in the side panel: "Robo's turn" while it is due, then the next turn's button, or "See who
 * won" after the last turn. Only one of them shows at a time. The next turn's button stays off while the page is
 * dealing, so a double tap deals once.
 */
export default function DuelTurnButtons({
  roboDue,
  turnDone,
  lastTurn,
  finished,
  nextLabel,
  dealing,
  onRoboTurn,
  onNext,
  onSeeWhoWon,
}: {
  roboDue: boolean
  turnDone: boolean
  lastTurn: boolean
  finished: boolean
  nextLabel: 'Next turn' | 'Next hand'
  dealing: boolean
  onRoboTurn: () => void
  onNext: () => void
  onSeeWhoWon: () => void
}) {
  return (
    <>
      {roboDue && (
        <button type="button" onClick={onRoboTurn} className={`tap-target ${PANEL_BUTTON} bg-hundreds text-ink`}>
          Robo's turn
        </button>
      )}
      {turnDone && !lastTurn && (
        <button type="button" onClick={onNext} disabled={dealing} className={`tap-target ${PANEL_BUTTON} bg-ink text-base disabled:opacity-40`}>
          {nextLabel}
        </button>
      )}
      {turnDone && lastTurn && !finished && (
        <button type="button" onClick={onSeeWhoWon} className={`tap-target ${PANEL_BUTTON} bg-ink text-base`}>
          See who won
        </button>
      )}
    </>
  )
}
