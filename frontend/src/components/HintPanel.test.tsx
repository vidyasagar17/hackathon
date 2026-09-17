import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import HintPanel from './HintPanel'

beforeEach(() => {
  vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn() })
  vi.stubGlobal('SpeechSynthesisUtterance', class {})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('a wrong answer offers Show me why until the hint arrives', async () => {
  const user = userEvent.setup()
  const onShowWhy = vi.fn()
  render(<HintPanel wrong hint={null} hintError={false} misconception="no_carry" onShowWhy={onShowWhy} />)

  await user.click(screen.getByRole('button', { name: 'Show me why' }))

  expect(onShowWhy).toHaveBeenCalledTimes(1)
  expect(screen.queryByText(/Diagnosed pattern/)).toBeNull()
})

test('nothing shows for a right answer', () => {
  const { container } = render(<HintPanel wrong={false} hint={null} hintError={false} misconception={null} onShowWhy={vi.fn()} />)
  expect(container.textContent).toBe('')
})

test('the hint shows with its picture, the diagnosed pattern and read-aloud, and the button goes', () => {
  render(
    <HintPanel
      wrong
      hint="Carry the 1 to the tens column."
      hintError={false}
      misconception="no_carry"
      onShowWhy={vi.fn()}
      picture={<p>picture</p>}
    />,
  )

  expect(screen.queryByRole('button', { name: 'Show me why' })).toBeNull()
  expect(screen.getByText('picture')).toBeTruthy()
  expect(screen.getByText('Carry the 1 to the tens column.')).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: no carry')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Read the hint aloud' })).toBeTruthy()
})

test('an undiagnosed hint has no pattern line, and a failed hint says so', () => {
  const { rerender } = render(<HintPanel wrong hint="Line up the columns." hintError={false} misconception={null} onShowWhy={vi.fn()} />)
  expect(screen.queryByText(/Diagnosed pattern/)).toBeNull()

  rerender(<HintPanel wrong hint={null} hintError misconception={null} onShowWhy={vi.fn()} />)
  expect(screen.getByText("Couldn't load the hint — try again.")).toBeTruthy()
})
