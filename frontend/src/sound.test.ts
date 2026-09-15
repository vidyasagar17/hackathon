import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { isMuted, playSound, setMuted } from './sound'

const fakeParam = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
const fakeContext = {
  currentTime: 0,
  destination: {},
  resume: vi.fn(),
  createGain: vi.fn(() => ({ gain: fakeParam, connect: vi.fn((node) => node) })),
  createOscillator: vi.fn(() => ({
    type: '',
    frequency: fakeParam,
    connect: vi.fn((node) => node),
    start: vi.fn(),
    stop: vi.fn(),
  })),
}

beforeEach(() => {
  localStorage.clear()
  fakeContext.createOscillator.mockClear()
  vi.stubGlobal('AudioContext', vi.fn(function FakeAudioContext() {
    return fakeContext
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('the correct sound plays two notes', () => {
  playSound('correct')

  expect(fakeContext.createOscillator).toHaveBeenCalledTimes(2)
})

test('the wrong sound plays one soft note', () => {
  playSound('wrong')

  expect(fakeContext.createOscillator).toHaveBeenCalledTimes(1)
})

test('muting silences every sound and is remembered', () => {
  setMuted(true)

  playSound('correct')
  playSound('wrong')

  expect(fakeContext.createOscillator).not.toHaveBeenCalled()
  expect(isMuted()).toBe(true)
})

test('a browser without Web Audio stays silent without errors', () => {
  vi.stubGlobal('AudioContext', undefined)

  expect(() => playSound('correct')).not.toThrow()
})
