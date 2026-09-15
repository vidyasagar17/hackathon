import { canSpeak, speak } from '../speech'
import SpeakerIcon from './SpeakerIcon'

/** Speaker button that reads `text` aloud. Not shown on browsers without a built-in voice. */
export default function ReadAloudButton({
  text,
  label = 'Read aloud',
}: {
  text: string
  label?: string
}) {
  if (!canSpeak()) return null

  return (
    <button
      type="button"
      onClick={() => speak(text)}
      className="tap-target inline-flex items-center gap-2 rounded-2xl border-4 border-ink bg-white px-3 font-display font-semibold text-ink"
    >
      <SpeakerIcon />
      {label}
    </button>
  )
}
