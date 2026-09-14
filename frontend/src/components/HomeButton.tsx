import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function HouseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7">
      <path
        d="M3 11.5 12 4l9 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 10v9.5h13V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Home button for the practice page. Leaving takes two steps, tap Home and then confirm,
 * so a stray tap never pulls a student out of a problem. Escape or "Keep playing" cancels.
 */
export default function HomeButton() {
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const keepPlayingRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!confirming) return
    keepPlayingRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirming(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [confirming])

  return (
    <div className="relative z-10">
      <button
        type="button"
        aria-expanded={confirming}
        aria-controls="leave-problem"
        onClick={() => setConfirming(true)}
        className="flex min-h-16 min-w-16 items-center gap-2 rounded-2xl bg-ink px-4 font-display text-lg font-semibold text-base"
      >
        <HouseIcon />
        Home
      </button>

      {confirming && (
        <div
          id="leave-problem"
          role="alertdialog"
          aria-labelledby="leave-problem-title"
          className="absolute left-0 top-20 w-72 rounded-2xl border-4 border-ink bg-white p-4"
        >
          <p id="leave-problem-title" className="font-display text-xl font-bold">
            Leave this problem?
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <button
              ref={keepPlayingRef}
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-16 rounded-2xl bg-ink font-display text-lg font-semibold text-base"
            >
              Keep playing
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="min-h-16 rounded-2xl border-4 border-ink bg-white font-display text-lg font-semibold text-ink"
            >
              Yes, go home
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
