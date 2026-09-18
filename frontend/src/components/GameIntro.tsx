import { useEffect, useState } from 'react'
import type { Game } from '../gameCatalog'
import { GRADE_BAND_LABELS } from '../gradeBand'
import type { Intro } from '../intros/types'
import { playSound } from '../sound'
import { speakWhenAllowed } from '../speech'
import AppHeader from './AppHeader'
import GameTable from './GameTable'
import HomeButton from './HomeButton'
import MuteToggle from './MuteToggle'
import NextArrow from './NextArrow'
import ReadAloudButton from './ReadAloudButton'
import TryItPanel from './TryItPanel'

const STEP_BUTTON =
  'flex items-center gap-2 rounded-2xl px-6 font-display text-xl font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-chalk focus-visible:ring-offset-2 focus-visible:ring-offset-felt'

/**
 * The door to a game: what it is and why it's fun, what math it practices, a "Watch how to play" demo walked one
 * step at a time on the game's own table, and a "Your turn!" move to try. The student moves the demo with Next and
 * Back — nothing plays by itself — and can press Play at any point. K–1 intros speak the pitch and each step once
 * the browser allows it, as the K–1 games do.
 */
export default function GameIntro({ game, intro, onPlay }: { game: Game; intro: Intro; onPlay: () => void }) {
  const [step, setStep] = useState(0)
  const speakAloud = game.band === 'k-1'
  const onTryIt = step === intro.steps.length
  const caption = onTryIt ? intro.tryIt.ask : intro.steps[step]

  useEffect(() => {
    if (!speakAloud) return
    speakWhenAllowed(step === 0 ? `${game.title}! ${intro.pitch} ${caption}` : caption)
  }, [speakAloud, step, caption, game.title, intro.pitch])

  const go = (next: number) => {
    playSound('tap')
    setStep(next)
  }

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader left={<HomeButton confirm={false} />} right={<MuteToggle />} />

      <main className="flex flex-1 flex-col items-center px-4 pb-8">
        <div className="flex w-full max-w-5xl flex-col items-center gap-6 md:flex-row md:items-start">
          <section aria-labelledby="intro-title" className="flex w-full max-w-md flex-col items-center gap-3 text-center md:w-80 md:items-start md:text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-24 w-28 items-center justify-center rounded-3xl border-4 border-ink bg-white [&_svg]:h-20 [&_svg]:w-24">
                {game.icon}
              </span>
              <p className="font-display text-base font-semibold text-ink-muted">
                {GRADE_BAND_LABELS[game.band]}
                <br />
                {game.kind === 'robo' ? 'You vs Robo' : 'Skill workshop'}
              </p>
            </div>
            <h1 id="intro-title" className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              {game.title}
            </h1>
            <p className="font-display text-xl font-semibold leading-snug sm:text-2xl">{intro.pitch}</p>
            <p className="rounded-2xl border-2 border-ink bg-white px-4 py-2 text-lg">
              <span className="font-bold">You'll practice: </span>
              {intro.skill}
            </p>
            <ReadAloudButton text={`${game.title}! ${intro.pitch} You'll practice ${intro.skill}.`} label="Hear about it" />
            <button
              type="button"
              onClick={onPlay}
              className="tap-target flex items-center gap-3 rounded-2xl bg-ink px-10 font-display text-3xl font-bold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2 active:translate-y-1 active:shadow-none"
            >
              Play!
              <NextArrow />
            </button>
          </section>

          <section aria-label="How to play" className="flex w-full flex-1 justify-center">
            <GameTable>
              <div className="flex flex-col items-center gap-3">
                <div className="flex w-full flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-2xl font-bold text-chalk">
                    {onTryIt ? 'Try a move' : 'Watch how to play'}
                  </h2>
                  <p className="font-display text-lg font-semibold text-chalk">
                    Step {step + 1} of {intro.steps.length + 1}
                  </p>
                </div>

                {onTryIt ? (
                  <TryItPanel tryIt={intro.tryIt} speakAloud={speakAloud} />
                ) : (
                  <>
                    <div className="flex min-h-56 w-full items-center justify-center">
                      {intro.scene(step)}
                    </div>
                    <div aria-live="polite" className="flex w-full items-center gap-3 rounded-2xl border-2 border-felt-edge bg-card px-4 py-3 text-ink">
                      <p className="flex-1 font-display text-xl font-semibold">{caption}</p>
                      <ReadAloudButton text={caption} label="Hear it" />
                    </div>
                  </>
                )}

                <div className="flex w-full items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => go(step - 1)}
                    disabled={step === 0}
                    className={`tap-target ${STEP_BUTTON} border-2 border-chalk text-chalk disabled:invisible`}
                  >
                    Back
                  </button>
                  {onTryIt ? (
                    <button type="button" onClick={onPlay} className={`tap-target ${STEP_BUTTON} bg-hundreds text-ink`}>
                      Play!
                      <NextArrow />
                    </button>
                  ) : (
                    <button type="button" onClick={() => go(step + 1)} className={`tap-target ${STEP_BUTTON} bg-hundreds text-ink`}>
                      Next
                      <NextArrow />
                    </button>
                  )}
                </div>
              </div>
            </GameTable>
          </section>
        </div>
      </main>
    </div>
  )
}
