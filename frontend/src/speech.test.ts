import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { setMuted } from './sound'
import { canSpeak, speak } from './speech'

const speechSynthesis = { speak: vi.fn(), cancel: vi.fn() }

class FakeUtterance {
  text: string
  rate = 1
  lang = ''
  constructor(text: string) {
    this.text = text
  }
}

beforeEach(() => {
  localStorage.clear()
  speechSynthesis.speak.mockClear()
  speechSynthesis.cancel.mockClear()
  vi.stubGlobal('speechSynthesis', speechSynthesis)
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('speaks the text slowly in English after stopping earlier speech', () => {
  speak('742 minus 158')

  expect(speechSynthesis.cancel).toHaveBeenCalledTimes(1)
  const utterance = speechSynthesis.speak.mock.calls[0][0] as FakeUtterance
  expect(utterance.text).toBe('742 minus 158')
  expect(utterance.rate).toBe(0.9)
  expect(utterance.lang).toBe('en-US')
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
