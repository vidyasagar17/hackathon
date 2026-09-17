import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import CoverTheNumberPage from './CoverTheNumberPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const HINT = "Say one number for each dot, and each dot only once: 1, 2, 3, 4, 5. That's 5."
const BOARD = [1, 2, 3, 4, 5, 6]

type Reply = { correct: boolean; misconception: string | null; state: Record<string, unknown> }

let replies: Record<string, Reply> = {}
let deals = 0

function state(update: Record<string, unknown> = {}) {
  return {
    level: 1,
    board: BOARD,
    turn: 1,
    turns: 10,
    step: 'roll',
    my_covered: [],
    robo_covered: [],
    my_roll: null,
    tapped: null,
    result: null,
    right: null,
    robo_last: null,
    winner: null,
    ...update,
  }
}

const ROLLED = { step: 'tap', my_roll: { values: [5], dots: null } }

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/cover-the-number/rounds')) {
    deals += 1
    return jsonResponse({
      round_id: `round-${deals}`,
      visible_state: state(),
      progress: { level: 1, correct_in_a_row: 2, needed: 3, top_level: 3 },
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: 'counted_one_too_many', hint: HINT, cards: null })
  const { move } = JSON.parse(String(init?.body))
  const reply = replies[move.type]
  return jsonResponse({ correct: reply.correct, misconception: reply.misconception, visible_state: state(reply.state) })
}

const speakSpy = vi.fn()

function stubSpeech() {
  vi.stubGlobal('speechSynthesis', { speak: speakSpy, cancel: vi.fn() })
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
  Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive: true }, configurable: true })
}

function spokenTexts() {
  return speakSpy.mock.calls.map(([utterance]) => utterance.text)
}

function movesSent() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([url]) => String(url).endsWith('/moves'))
    .map(([, init]) => JSON.parse(String(init?.body)).move)
}

beforeEach(() => {
  replies = {
    roll: { correct: true, misconception: null, state: ROLLED },
    tap: {
      correct: false,
      misconception: 'counted_one_too_many',
      state: { ...ROLLED, step: 'pass', tapped: 6, result: 'wrong', right: 5 },
    },
    roll_again: { correct: true, misconception: null, state: { step: 'tap', my_covered: [5], my_roll: { values: [2], dots: null } } },
    robo_turn: {
      correct: true,
      misconception: null,
      state: { step: 'roll', turn: 2, robo_covered: [3], robo_last: { rolls: [{ values: [3], dots: null }], covered: 3 } },
    },
  }
  deals = 0
  speakSpy.mockClear()
  vi.mocked(playSound).mockClear()
  Element.prototype.animate = vi.fn() as unknown as Element['animate']
  vi.stubGlobal('fetch', vi.fn(fakeApi))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
  stubSpeech()
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/curriculum/cover-the-number']}>
      <Routes>
        <Route path="/curriculum/cover-the-number" element={<CoverTheNumberPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function number(value: number) {
  return within(screen.getByRole('group', { name: 'Your board' })).getByRole('button', { name: new RegExp(`^Number ${value}`) }) as HTMLButtonElement
}

test('rolling shows the die and asks how many dots, with the board to tap', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Roll' }))

  expect(await screen.findByRole('img', { name: '5 dots' })).toBeTruthy()
  expect(screen.getByText('How many dots?')).toBeTruthy()
  expect(screen.getByText('Turn 1 of 10')).toBeTruthy()
  expect(number(1).disabled).toBe(false)
  expect(movesSent()).toEqual([{ type: 'roll' }])
  expect(spokenTexts()).toContain('Tap the number of dots.')
})

test('a right tap covers the number', async () => {
  const user = userEvent.setup()
  replies.tap = { correct: true, misconception: null, state: { ...ROLLED, step: 'pass', my_covered: [5], tapped: 5, result: 'covered', right: 5 } }
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Roll' }))
  await user.click(await screen.findByRole('button', { name: /^Number 5/ }))

  expect(playSound).toHaveBeenCalledWith('correct')
  expect(number(5).getAttribute('aria-label')).toBe('Number 5, covered')
  expect(spokenTexts()).toContain("Yes, 5! You covered 5. Tap Robo's turn.")
  expect(screen.getByRole('button', { name: "Robo's turn" })).toBeTruthy()
})

test('a wrong tap wobbles, outlines the right number, resets the stars and shows and speaks the hint', async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Roll' }))
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()
  await user.click(await screen.findByRole('button', { name: /^Number 6/ }))

  expect(await screen.findByText(HINT)).toBeTruthy()
  expect(Element.prototype.animate).toHaveBeenCalledTimes(1)
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(number(5).getAttribute('aria-label')).toBe('Number 5, the right answer')
  expect(spokenTexts()).toContain(`${HINT} Tap Robo's turn.`)
  expect(screen.queryByText(/Diagnosed pattern/)).toBeNull()
})

test('a right tap on a covered number offers Roll again', async () => {
  const user = userEvent.setup()
  replies.tap = { correct: true, misconception: null, state: { ...ROLLED, step: 'roll_again', my_covered: [5], tapped: 5, result: 'already', right: 5 } }
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Roll' }))
  await user.click(await screen.findByRole('button', { name: /^Number 5/ }))

  expect(await screen.findByText('5 is already covered.')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Roll again' }))
  expect(movesSent().at(-1)).toEqual({ type: 'roll_again' })
  expect(await screen.findByRole('img', { name: '2 dots' })).toBeTruthy()
})

test("Robo's turn shows Robo's roll and what it covered", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Roll' }))
  await user.click(await screen.findByRole('button', { name: /^Number 6/ }))
  await user.click(await screen.findByRole('button', { name: "Robo's turn" }))

  expect(await screen.findByText('Robo rolled 3 and covered 3.')).toBeTruthy()
  expect(screen.getByRole('img', { name: "Robo's board: 1 of 6 covered" })).toBeTruthy()
  expect(screen.getByText('Turn 2 of 10')).toBeTruthy()
  expect(screen.queryByText(HINT)).toBeNull()
})

test('the scattered dot card shows at level 2 and the result ends the game', async () => {
  const user = userEvent.setup()
  replies.roll = { correct: true, misconception: null, state: { level: 2, board: [1, 2, 3], step: 'tap', my_roll: { values: [3], dots: [[20, 20], [50, 60], [80, 30]] } } }
  replies.tap = {
    correct: true,
    misconception: null,
    state: { level: 2, board: [1, 2, 3], step: 'over', my_covered: [1, 2, 3], robo_covered: [1], tapped: 3, result: 'covered', right: 3, winner: 'mine' },
  }
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Roll' }))
  expect(await screen.findByRole('img', { name: '3 dots' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: /^Number 3/ }))

  expect(await screen.findByText('You covered 3. Robo covered 1. You win!')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Play again' }))
  expect(deals).toBe(2)
})
