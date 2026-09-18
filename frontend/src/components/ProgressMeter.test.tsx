import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import * as sound from '../sound'
import ProgressMeter, { type Progress } from './ProgressMeter'

let reducedMotion = false
const animate = vi.fn()
const playSoundSpy = vi.spyOn(sound, 'playSound').mockImplementation(() => {})

beforeEach(() => {
  reducedMotion = false
  animate.mockClear()
  playSoundSpy.mockClear()
  Element.prototype.animate = animate as unknown as Element['animate']
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reducedMotion })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function progress(level: number, correct_in_a_row: number): Progress {
  return { level, correct_in_a_row, needed: 3, top_level: 3 }
}

function renderMeter(start: Progress, canCelebrate = true) {
  const { rerender } = render(<ProgressMeter progress={start} canCelebrate={canCelebrate} />)
  return (next: Progress) => rerender(<ProgressMeter progress={next} canCelebrate={canCelebrate} />)
}

function stars() {
  return screen.getByRole('img').querySelectorAll('svg')
}

test('shows the level, filled stars, and how many more are needed', () => {
  renderMeter(progress(2, 1))

  expect(screen.getByText('Level 2')).toBeTruthy()
  expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy()
  expect(screen.getByText('2 more right in a row to reach Level 3')).toBeTruthy()
})

test('says the next level is coming once every star is filled', () => {
  renderMeter(progress(1, 3))

  expect(screen.getByText('Level 2 is next!')).toBeTruthy()
})

test('says top level at the highest level', () => {
  renderMeter(progress(3, 2))

  expect(screen.getByText('Top level!')).toBeTruthy()
})

test('showing progress without gaining a star animates nothing', () => {
  renderMeter(progress(2, 2))

  expect(animate).not.toHaveBeenCalled()
})

test('gaining a star pops that star', () => {
  const update = renderMeter(progress(2, 1))

  update(progress(2, 2))

  expect(animate).toHaveBeenCalledTimes(1)
  expect(animate.mock.contexts[0]).toBe(stars()[1])
})

test('the star that completes a level pulses the ring around the stars and plays level_up sound', () => {
  const update = renderMeter(progress(1, 2))

  update(progress(1, 3))

  expect(animate).toHaveBeenCalledTimes(1)
  expect(animate.mock.contexts[0]).toBe(screen.getByRole('img'))
  expect(playSoundSpy).toHaveBeenCalledWith('level_up')
})

test('at the top level the third star just pops', () => {
  const update = renderMeter(progress(3, 2))

  update(progress(3, 3))

  expect(animate).toHaveBeenCalledTimes(1)
  expect(animate.mock.contexts[0]).toBe(stars()[2])
})

test('losing stars animates nothing', () => {
  const update = renderMeter(progress(2, 2))

  update(progress(2, 0))

  expect(animate).not.toHaveBeenCalled()
})

test('reduce motion turns the celebration off', () => {
  reducedMotion = true
  const update = renderMeter(progress(2, 1))

  update(progress(2, 2))

  expect(animate).not.toHaveBeenCalled()
})

test('no celebration while a math animation is running', () => {
  const update = renderMeter(progress(2, 1), false)

  update(progress(2, 2))

  expect(animate).not.toHaveBeenCalled()
})
