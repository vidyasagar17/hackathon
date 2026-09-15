export type SoundName = 'correct' | 'wrong' | 'tap'

type Note = { frequency: number; start: number; duration: number }

/** Short, soft sine tones (seconds). "wrong" is a single low note, never a buzzer. */
const NOTES: Record<SoundName, Note[]> = {
  correct: [
    { frequency: 523.25, start: 0, duration: 0.12 },
    { frequency: 783.99, start: 0.12, duration: 0.13 },
  ],
  wrong: [{ frequency: 220, start: 0, duration: 0.2 }],
  tap: [{ frequency: 880, start: 0, duration: 0.06 }],
}

const MUTED_KEY = 'sound_muted'
const PEAK_VOLUME = 0.15

let context: AudioContext | null = null

export function isMuted(): boolean {
  return localStorage.getItem(MUTED_KEY) === 'true'
}

export function setMuted(muted: boolean): void {
  localStorage.setItem(MUTED_KEY, String(muted))
}

/**
 * Start the audio engine inside the student's first tap or key press.
 * Browsers (Safari especially) only allow sound to start from a user action.
 */
export function unlockSoundOnFirstInteraction(): void {
  const unlock = () => {
    if (typeof AudioContext === 'undefined') return
    context ??= new AudioContext()
    void context.resume()
  }
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('keydown', unlock, { once: true })
}

/** Play a generated sound. Silent when muted or when the browser has no Web Audio support. */
export function playSound(name: SoundName): void {
  if (isMuted() || typeof AudioContext === 'undefined') return
  context ??= new AudioContext()
  const now = context.currentTime
  for (const note of NOTES[name]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = note.frequency
    gain.gain.setValueAtTime(0.0001, now + note.start)
    gain.gain.exponentialRampToValueAtTime(PEAK_VOLUME, now + note.start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now + note.start)
    oscillator.stop(now + note.start + note.duration)
  }
}
