import { isMuted } from './sound'

const CHILD_FRIENDLY_RATE = 0.95
const CHILD_FRIENDLY_PITCH = 1.1

/** True when this browser has a built-in voice (the Web Speech API). */
export function canSpeak(): boolean {
  return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

/**
 * Pick the friendliest, most natural-sounding English voice available on the device.
 * Prefers natural neural voices (e.g. Google US English, Jenny Natural, Samantha) over mechanical defaults.
 */
export function getFriendlyVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices?.() ?? []
  if (voices.length === 0) return null

  const englishVoices = voices.filter((v) => v.lang.startsWith('en'))
  if (englishVoices.length === 0) return voices[0] ?? null

  // Priority 1: High-quality natural neural voices
  const natural = englishVoices.find(
    (v) =>
      v.name.includes('Natural') ||
      v.name.includes('Neural') ||
      v.name.includes('Online'),
  )
  if (natural) return natural

  // Priority 2: Well-known warm, friendly English voices
  const preferredNames = ['Google US English', 'Samantha', 'Jenny', 'Zira', 'Karen', 'Victoria']
  for (const name of preferredNames) {
    const matched = englishVoices.find((v) => v.name.includes(name))
    if (matched) return matched
  }

  // Priority 3: Default US English or any English
  return englishVoices.find((v) => v.lang === 'en-US') ?? englishVoices[0]
}

/** Read text aloud with a warm, friendly voice, stopping anything already being read. Silent when muted. */
export function speak(text: string): void {
  if (isMuted() || !canSpeak()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = CHILD_FRIENDLY_RATE
  utterance.pitch = CHILD_FRIENDLY_PITCH
  utterance.lang = 'en-US'

  const voice = getFriendlyVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang
  }

  window.speechSynthesis.speak(utterance)
}

/**
 * Speak without a tap of its own, but only once the browser allows it: after the student has tapped
 * or typed on the site. Browsers without `navigator.userActivation` are allowed to try.
 */
export function speakWhenAllowed(text: string): void {
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
  if (activation && !activation.hasBeenActive) return
  speak(text)
}
