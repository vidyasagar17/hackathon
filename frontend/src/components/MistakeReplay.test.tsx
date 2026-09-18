import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import MistakeReplay from './MistakeReplay'
import { buildReplaySteps } from '../replay'

// 403 - 158 answered 255: the ones are right, the tens are where the bug shows.
const COLUMNS = [
  { place: 'hundreds' as const, minuend_digit: 4, subtrahend_digit: 1 },
  { place: 'tens' as const, minuend_digit: 0, subtrahend_digit: 5 },
  { place: 'ones' as const, minuend_digit: 3, subtrahend_digit: 8 },
]

const HINT = 'The tens had nothing to lend, so borrow from the hundreds first.'

function renderReplay(yours = 255) {
  render(
    <MistakeReplay
      steps={buildReplaySteps(COLUMNS, 'minuend_digit', 'subtrahend_digit', 245, yours)}
      operator="−"
      explanation={HINT}
    />,
  )
}

beforeEach(() => {
  // jsdom has neither of these; the component uses them only for the landing digit.
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  Element.prototype.animate = vi.fn().mockReturnValue({ finished: Promise.resolve() })
})

test('nothing is filled in until the student asks for the first step', () => {
  renderReplay()

  expect(screen.getByText(/Press Next to walk through it/)).toBeTruthy()
  expect(screen.queryByText(HINT)).toBeNull()
})

test('both ways are shown side by side', () => {
  renderReplay()

  expect(screen.getByRole('heading', { name: 'Your way' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'The right way' })).toBeTruthy()
})

test('the first step narrates the ones column the student got right', async () => {
  const user = userEvent.setup()
  renderReplay()

  await user.click(screen.getByRole('button', { name: 'Next' }))

  expect(screen.getByText('O: 3 − 8. You wrote 5, which is right.')).toBeTruthy()
})

test('the step where the two answers part company names the right digit', async () => {
  const user = userEvent.setup()
  renderReplay()

  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Next place' }))

  expect(screen.getByText('T: 0 − 5. You wrote 5, and 4 belongs here.')).toBeTruthy()
})

test('the diagnosed explanation appears only once the walk reaches the mistake', async () => {
  const user = userEvent.setup()
  renderReplay()

  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.queryByText(HINT)).toBeNull()

  await user.click(screen.getByRole('button', { name: 'Next place' }))
  expect(screen.getByText(HINT)).toBeTruthy()
})

test('the walk stops at the last place', async () => {
  const user = userEvent.setup()
  renderReplay()

  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Next place' }))
  await user.click(screen.getByRole('button', { name: 'Next place' }))

  const last = screen.getByRole('button', { name: 'That’s the whole thing' })
  expect(last.hasAttribute('disabled')).toBe(true)
})

test('only one digit lands per step, so nothing else is animating', async () => {
  const user = userEvent.setup()
  renderReplay()

  await user.click(screen.getByRole('button', { name: 'Next' }))

  // Two rows advance together, the student's and the correct one: one digit each, never a whole row.
  expect(Element.prototype.animate).toHaveBeenCalledTimes(2)
})

test('nothing animates when the device asks for less motion', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  const user = userEvent.setup()
  renderReplay()

  await user.click(screen.getByRole('button', { name: 'Next' }))

  expect(Element.prototype.animate).not.toHaveBeenCalled()
  // The walk still works; only the movement is dropped.
  expect(screen.getByText('O: 3 − 8. You wrote 5, which is right.')).toBeTruthy()
})
