import { isMuted } from './sound'

const CHILD_FRIENDLY_RATE = 0.9

/** True when this browser has a built-in voice (the Web Speech API). */
export function canSpeak(): boolean {
  return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

/** Read text aloud with the browser's voice, stopping anything already being read. Silent when muted. */
export function speak(text: string): void {
  if (isMuted() || !canSpeak()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = CHILD_FRIENDLY_RATE
  utterance.lang = 'en-US'
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
