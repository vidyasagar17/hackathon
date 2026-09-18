import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import FourInARowPage from './FourInARowPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const HINT = 'Fourteen is 1 ten and 4 ones, so the 1 comes first: 14.'
const CELLS = [14, 14, 3, 41, 13, ...Array.from({ length: 20 }, () => 11)]
const EMPTY = Array.from({ length: 25 }, () => null)

type Reply = { correct: boolean; misconception: string | null; state: Record<string, unknown> }

let replies: Record<string, Reply> = {}
let deals = 0

function state(update: Record<string, unknown> = {}) {
  return {
    level: 2,
    cells: CELLS,
    owners: EMPTY,
    step: 'tap',
    fact: [10, 4],
    tapped: null,
    right_cells: null,
    my_count: 0,
    robo_count: 0,
    robo_last: null,
    winner: null,
    line: null,
    ...update,
  }
}

function covered(cells: Record<number, 'mine' | 'robo'>) {
  return EMPTY.map((_, index) => cells[index] ?? null)
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/four-in-a-row/rounds')) {
    deals += 1
    return jsonResponse({
      round_id: `round-${deals}`,
      visible_state: state(),
      progress: { level: 2, correct_in_a_row: 2, needed: 3, top_level: 3 },
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: 'reversed_teen_digits', hint: HINT, cards: null })
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
    tap: {
      correct: false,
      misconception: 'reversed_teen_digits',
      state: { step: 'pass', tapped: 3, right_cells: [0, 1] },
    },
    robo_turn: {
      correct: true,
      misconception: null,
      state: { step: 'tap', owners: covered({ 4: 'robo' }), robo_count: 1, robo_last: { fact: [9, 4], cell: 4 }, fact: [3, 8] },
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
    <MemoryRouter initialEntries={['/curriculum/four-in-a-row']}>
      <Routes>
        <Route path="/curriculum/four-in-a-row" element={<FourInARowPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function space(index: number) {
  return within(screen.getByRole('group', { name: 'Board' })).getAllByRole('button')[index] as HTMLButtonElement
}

test('a game shows the fact as two cards and a 5 by 5 board of numbers, and speaks the question', async () => {
  renderPage()

  expect(await screen.findByRole('group', { name: 'Your cards: 10 and 4' })).toBeTruthy()
  const spaces = within(screen.getByRole('group', { name: 'Board' })).getAllByRole('button')
  expect(spaces).toHaveLength(25)
  expect(spaces[3].getAttribute('aria-label')).toBe('Space 41')
  expect(spokenTexts()).toContain('You have 10 and 4. Tap the space that shows how many in all.')
})

test('a right tap covers the space with your star and offers Robo’s turn', async () => {
  const user = userEvent.setup()
  replies.tap = { correct: true, misconception: null, state: { step: 'pass', tapped: 0, right_cells: [0], owners: covered({ 0: 'mine' }), my_count: 1 } }
  renderPage()
  await screen.findByRole('group', { name: 'Board' })

  await user.click(space(0))

  expect(movesSent()).toEqual([{ type: 'tap', cell: 0 }])
  expect(playSound).toHaveBeenCalledWith('correct')
  expect(space(0).getAttribute('aria-label')).toBe('Space 14, yours')
  expect(screen.getByRole('button', { name: "Robo's turn" })).toBeTruthy()
  expect(spokenTexts()).toContain("Yes! 10 and 4 make 14. Tap Robo's turn.")
})

test('a wrong tap wobbles, outlines the right spaces, resets the stars, and shows and speaks the hint with no red text', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('group', { name: 'Board' })
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()

  await user.click(space(3))

  expect(await screen.findByText(HINT)).toBeTruthy()
  expect(Element.prototype.animate).toHaveBeenCalledTimes(1)
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(space(0).getAttribute('aria-label')).toBe('Space 14, the right answer')
  expect(space(1).getAttribute('aria-label')).toBe('Space 14, the right answer')
  expect(space(3).disabled).toBe(true)
  expect(spokenTexts()).toContain(`${HINT} 10 and 4 make 14. Tap Robo's turn.`)
  expect(screen.queryByText(/Diagnosed pattern/)).toBeNull()
  expect(document.querySelector('.text-alert-text')).toBeNull()
})

test("Robo's turn shows what Robo covered and deals your next fact", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('group', { name: 'Board' })
  await user.click(space(3))
  await user.click(await screen.findByRole('button', { name: "Robo's turn" }))

  expect(await screen.findByText('Robo had 9 and 4 and covered 13.')).toBeTruthy()
  expect(space(4).getAttribute('aria-label')).toBe("Space 13, Robo's")
  expect(screen.getByRole('group', { name: 'Your cards: 3 and 8' })).toBeTruthy()
  expect(screen.queryByText(HINT)).toBeNull()
  expect(spokenTexts()).toContain('Robo had 9 and 4 and covered 13. You have 3 and 8. Tap the space that shows how many in all.')
})

test('four in a row ends the game with the line outlined, and Play again deals a new board', async () => {
  const user = userEvent.setup()
  replies.tap = {
    correct: true,
    misconception: null,
    state: { step: 'over', tapped: 0, right_cells: [0], owners: covered({ 0: 'mine', 5: 'mine', 10: 'mine', 15: 'mine' }), my_count: 4, winner: 'mine', line: [0, 5, 10, 15] },
  }
  renderPage()
  await screen.findByRole('group', { name: 'Board' })

  await user.click(space(0))

  expect(await screen.findByText('Four in a row! You win!')).toBeTruthy()
  expect(space(15).getAttribute('aria-label')).toBe('Space 11, yours, in the line')
  await user.click(screen.getByRole('button', { name: 'Play again' }))
  expect(deals).toBe(2)
})
