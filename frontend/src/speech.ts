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
