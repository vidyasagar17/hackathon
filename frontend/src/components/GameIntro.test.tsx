import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import { GAMES, gameId } from '../gameCatalog'
import { INTROS } from '../intros'
import { playSound } from '../sound'
import GameIntro from './GameIntro'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const speakSpy = vi.fn()

beforeEach(() => {
  speakSpy.mockClear()
  vi.mocked(playSound).mockClear()
  Element.prototype.animate = vi.fn() as unknown as Element['animate']
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  vi.stubGlobal('speechSynthesis', { speak: speakSpy, cancel: vi.fn() })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      constructor(text: string) {
        this.text = text
      }
    },
  )
  Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive: true }, configurable: true })
})

function spokenTexts(): string[] {
  return speakSpy.mock.calls.map(([utterance]) => utterance.text)
}

function renderIntro(id: string, onPlay = () => {}) {
  const game = GAMES.find((entry) => gameId(entry) === id)!
  render(
    <MemoryRouter>
      <GameIntro game={game} intro={INTROS[id]} onPlay={onPlay} />
    </MemoryRouter>,
  )
  return INTROS[id]
}

async function goToTryIt(user: ReturnType<typeof userEvent.setup>, steps: number) {
  for (let step = 0; step < steps; step += 1) await user.click(screen.getByRole('button', { name: 'Next' }))
}

test('the intro names the game, sells it, and says what it practices', () => {
  const intro = renderIntro('clock-match')

  expect(screen.getByRole('heading', { level: 1, name: 'Clock Match' })).toBeTruthy()
  expect(screen.getByText(intro.pitch)).toBeTruthy()
  expect(screen.getByText(intro.skill)).toBeTruthy()
  expect(screen.getByText(/You vs Robo/)).toBeTruthy()
})

test('Next and Back walk the demo one caption at a time', async () => {
  const user = userEvent.setup()
  const intro = renderIntro('decimal-war')

  expect(screen.getByText(intro.steps[0])).toBeTruthy()
  expect(screen.getByText(`Step 1 of ${intro.steps.length + 1}`)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByText(intro.steps[1])).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByText(intro.steps[0])).toBeTruthy()
})

test('Play starts the game from the first screen or the last', async () => {
  const user = userEvent.setup()
  const onPlay = vi.fn()
  const intro = renderIntro('the-24-game', onPlay)

  await user.click(screen.getAllByRole('button', { name: 'Play!' })[0])
  await goToTryIt(user, intro.steps.length)
  const playButtons = screen.getAllByRole('button', { name: 'Play!' })
  await user.click(playButtons[playButtons.length - 1])

  expect(onPlay).toHaveBeenCalledTimes(2)
})

test('a wrong try wobbles, rules that choice out and shows the right way, never in red', async () => {
  const user = userEvent.setup()
  const intro = renderIntro('volume-builder')
  await goToTryIt(user, intro.steps.length)

  const wrong = screen.getByRole('button', { name: '12' })
  await user.click(wrong)

  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(Element.prototype.animate).toHaveBeenCalled()
  expect(wrong.hasAttribute('disabled')).toBe(true)
  const nudge = screen.getByText(intro.tryIt.nudge)
  expect(nudge.className).not.toContain('alert')
})

test('a right try cheers, and the choices close', async () => {
  const user = userEvent.setup()
  const intro = renderIntro('decimal-war')
  await goToTryIt(user, intro.steps.length)

  await user.click(screen.getByRole('button', { name: '0.3' }))

  expect(playSound).toHaveBeenCalledWith('correct')
  expect(screen.getByText(intro.tryIt.cheer)).toBeTruthy()
  const choices = within(screen.getByRole('group', { name: 'Choices' })).getAllByRole('button')
  expect(choices.every((choice) => choice.hasAttribute('disabled'))).toBe(true)
})

test('a K–1 intro speaks the pitch, each step, and the try-it answers', async () => {
  const user = userEvent.setup()
  const intro = renderIntro('four-in-a-row')

  expect(spokenTexts()[0]).toBe(`Four in a Row! ${intro.pitch} ${intro.steps[0]}`)
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(spokenTexts()).toContain(intro.steps[1])
  await goToTryIt(user, intro.steps.length - 1)
  expect(spokenTexts()).toContain(intro.tryIt.ask)
  await user.click(screen.getByRole('button', { name: '5' }))
  expect(spokenTexts()).toContain(intro.tryIt.cheer)
})

test('an intro for older students waits for a tap before speaking', () => {
  renderIntro('the-24-game')

  expect(speakSpy).not.toHaveBeenCalled()
})
