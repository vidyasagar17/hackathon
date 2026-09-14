import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import ReadAloudButton from './ReadAloudButton'

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
  vi.stubGlobal('speechSynthesis', speechSynthesis)
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('reads its text aloud when tapped', async () => {
  const user = userEvent.setup()
  render(<ReadAloudButton text="84 divided by 4" label="Read the problem aloud" />)

  await user.click(screen.getByRole('button', { name: 'Read the problem aloud' }))

  expect((speechSynthesis.speak.mock.calls[0][0] as FakeUtterance).text).toBe('84 divided by 4')
})

test('is not shown when the browser has no voice', () => {
  vi.stubGlobal('SpeechSynthesisUtterance', undefined)
  render(<ReadAloudButton text="84 divided by 4" />)

  expect(screen.queryByRole('button')).toBeNull()
})
