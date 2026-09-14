import { useState } from 'react'
import { isMuted, setMuted } from '../sound'

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="M16 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path
          d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

/** Header switch for all game sounds. Its label always says the current state. */
export default function MuteToggle() {
  const [muted, setMutedState] = useState(isMuted)

  const toggle = () => {
    setMuted(!muted)
    setMutedState(!muted)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex min-h-12 items-center gap-2 rounded-2xl border-4 border-ink bg-white px-3 font-display font-semibold text-ink"
    >
      <SpeakerIcon muted={muted} />
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  )
}
