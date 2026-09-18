import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { setMuted } from './sound'
import { canSpeak, speak } from './speech'

const speechSynthesis = { speak: vi.fn(), cancel: vi.fn() }

class FakeUtterance {
  text: string
  rate = 1
  pitch = 1
  lang = ''
  voice: SpeechSynthesisVoice | null = null
  constructor(text: string) {
    this.text = text
  }
}

beforeEach(() => {
  localStorage.clear()
  speechSynthesis.speak.mockClear()
  speechSynthesis.cancel.mockClear()
  vi.stubGlobal('speechSynthesis', {
    ...speechSynthesis,
    getVoices: () => [
      { name: 'Google US English', lang: 'en-US' } as SpeechSynthesisVoice,
    ],
  })
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('speaks the text in a natural, child-friendly English voice after stopping earlier speech', () => {
  speak('742 minus 158')

  expect(speechSynthesis.cancel).toHaveBeenCalledTimes(1)
  const utterance = speechSynthesis.speak.mock.calls[0][0] as FakeUtterance
  expect(utterance.text).toBe('742 minus 158')
  expect(utterance.rate).toBe(0.95)
  expect(utterance.pitch).toBe(1.1)
  expect(utterance.lang).toBe('en-US')
  expect(utterance.voice?.name).toBe('Google US English')
})

test('muting sound also silences speech', () => {
  setMuted(true)

  speak('742 minus 158')

  expect(speechSynthesis.speak).not.toHaveBeenCalled()
})

test('a browser without a voice cannot speak and stays silent', () => {
  vi.stubGlobal('SpeechSynthesisUtterance', undefined)

  expect(canSpeak()).toBe(false)
  expect(() => speak('742 minus 158')).not.toThrow()
})
