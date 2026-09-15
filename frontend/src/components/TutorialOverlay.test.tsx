import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import TutorialOverlay from './TutorialOverlay'

const speak = vi.fn()

beforeEach(() => {
  localStorage.clear()
  speak.mockClear()
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      rate = 1
      lang = ''
      constructor(text: string) {
        this.text = text
      }
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('each tutorial caption can be read aloud', async () => {
  const user = userEvent.setup()
  render(<TutorialOverlay usesColumnChips onDone={() => {}} />)

  await user.click(screen.getByRole('button', { name: 'Read aloud' }))

  expect(speak.mock.calls[0][0].text).toBe(
    'Numbers are colored by place: yellow is hundreds, blue is tens, pink is ones. Each has a letter too: H, T, O.',
  )
})
