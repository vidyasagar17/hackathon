import { useEffect, useRef } from 'react'
import { duelOutcome } from '../duel'
import { prefersReducedMotion } from '../motion'
import { playSound } from '../sound'

/** Shared look of the panel buttons; each tag still writes `tap-target` so `check:tap-targets` can see it. */
const PANEL_BUTTON =
  'rounded-2xl px-6 font-display text-xl font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

/** The win celebration's ring pulse: one run, under decision 1's 1.5 s limit. */
const WIN_PULSE_MS = 1200

/** True while any animation on the page is still playing, so a celebration never overlaps it. */
function animationRunning() {
  return document.getAnimations?.().some((animation) => animation.playState === 'running') ?? false
}

/**
 * The end of a points duel: both scores, who won, and Play again (off while the page is dealing). By default it sits
 * in the side panel under the last turn; `card` shows it as its own card in place of the table. With `celebrate`, a
 * win pulses a ring around the card once (decision 1's feedback cue, triggered by the student's "See who won" press);
 * nothing plays under reduced motion or while another animation is still running.
 */
export default function DuelResult({
  myPoints,
  roboPoints,
  noun = 'game',
  card = false,
  celebrate = false,
  dealing,
  onPlayAgain,
}: {
  myPoints: number
  roboPoints: number
  noun?: 'game' | 'duel'
  card?: boolean
  celebrate?: boolean
  dealing: boolean
  onPlayAgain: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const celebrated = useRef(false)
  const won = myPoints > roboPoints

  useEffect(() => {
    if (!celebrate || !won || celebrated.current || prefersReducedMotion() || animationRunning()) return
    celebrated.current = true
    playSound('victory')
    cardRef.current?.animate(
      [{ boxShadow: '0 0 0 0 rgba(61, 220, 151, 0.8)' }, { boxShadow: '0 0 0 18px rgba(61, 220, 151, 0)' }],
      { duration: WIN_PULSE_MS, easing: 'ease-out' },
    )
  }, [celebrate, won])

  return (
    <div
      ref={cardRef}
      role="group"
      aria-label={noun === 'duel' ? 'Duel result' : 'Game result'}
      aria-live={card ? 'polite' : undefined}
      className={
        card
          ? 'mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border-2 border-felt-edge bg-card p-6'
          : 'flex flex-col items-start gap-2'
      }
    >
      <p className={`font-display font-semibold ${card ? 'text-2xl' : 'text-xl'}`}>{`You ${myPoints} · Robo ${roboPoints}`}</p>
      <p className="font-display text-3xl font-bold">{duelOutcome(myPoints, roboPoints, noun)}</p>
      <button type="button" onClick={onPlayAgain} disabled={dealing} className={`tap-target ${PANEL_BUTTON} bg-ink text-base disabled:opacity-40`}>
        Play again
      </button>
    </div>
  )
}
