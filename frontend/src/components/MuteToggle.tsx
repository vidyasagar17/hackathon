import { useState } from 'react'
import { isMuted, setMuted } from '../sound'
import SpeakerIcon from './SpeakerIcon'

/** Header switch for all game sounds and speech. Its label always says the current state. */
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
