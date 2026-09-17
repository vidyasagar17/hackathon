import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import TargetNumberPage from './TargetNumberPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const STEP_HINT = 'When you count on from 9, the first number you say is 10, not 9.'
const EQUATION_HINT = '= means both sides are the same amount. The left side is 16, so 2 + □ must make 16 too: 2 + 14 = 16.'

type Reply = { correct: boolean; misconception: string | null; state: Record<string, unknown> }

let replies: Record<string, Reply[]> = {}
let hint = STEP_HINT
let deals = 0

const ROBO = { cards: [7, 9, 2, 6, 4], way: ['7 + 9 = 16'] }
const EQUATION = { left: [16], right: 2 }

function state(update: Record<string, unknown> = {}) {
  return {
    level: 1,
    top: 20,
    cards: [9, 5, 3, 1, 8],
    target: 16,
    way: [],
    total: null,
    steps: [],
    stuck: false,
    made: false,
    shown_way: null,
    done: false,
    robo: null,
    equation: null,
    equation_answer: null,
    equation_value: null,
    ...update,
  }
}

const STARTED = { way: [0], total: 9 }
const step = (before: number, sign: string, card: number, answer: number, after: number) => ({ before, sign, card, answer, after })

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/target-number/rounds')) {
    deals += 1
    return jsonResponse({
      round_id: `round-${deals}`,
      visible_state: state(),
      progress: { level: 1, correct_in_a_row: 2, needed: 3, top_level: 3 },
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: null, hint, cards: null })
  const { move } = JSON.parse(String(init?.body))
  const reply = replies[move.type].shift() as Reply
  return jsonResponse({ correct: reply.correct, misconception: reply.misconception, visible_state: state(reply.state) })
}

function movesSent() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([url]) => String(url).endsWith('/moves'))
    .map(([, init]) => JSON.parse(String(init?.body)).move)
}

const MADE_RIGHT: Reply = {
  correct: true,
  misconception: null,
  state: {
    way: [0, 4, 3],
    total: 16,
    steps: [step(9, '+', 8, 17, 17), step(17, '-', 1, 16, 16)],
    made: true,
    done: true,
    robo: ROBO,
    equation: EQUATION,
  },
}

beforeEach(() => {
  replies = {
    start: [{ correct: true, misconception: null, state: STARTED }],
    step: [
      {
        correct: false,
        misconception: 'counted_on_from_start',
        state: { way: [0, 4], total: 17, steps: [step(9, '+', 8, 16, 17)] },
      },
    ],
    start_over: [{ correct: true, misconception: null, state: {} }],
    show_way: [
      {
        correct: true,
        misconception: null,
        state: { shown_way: ['9 − 1 = 8', '8 + 8 = 16'], done: true, robo: ROBO, equation: EQUATION },
      },
    ],
    equation: [
      {
        correct: false,
        misconception: 'added_all_numbers',
        state: { shown_way: ['9 − 1 = 8', '8 + 8 = 16'], done: true, robo: ROBO, equation: EQUATION, equation_answer: 18, equation_value: 14 },
      },
    ],
  }
  hint = STEP_HINT
  deals = 0
  vi.mocked(playSound).mockClear()
  Element.prototype.animate = vi.fn() as unknown as Element['animate']
  vi.stubGlobal('fetch', vi.fn(fakeApi))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/curriculum/target-number']}>
      <Routes>
        <Route path="/curriculum/target-number" element={<TargetNumberPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function button(name: string | RegExp) {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

async function type(user: UserEvent, digits: string) {
  const keypad = within(screen.getByRole('group', { name: 'Number keypad' }))
  for (const digit of digits) await user.click(keypad.getByRole('button', { name: digit }))
  await user.click(keypad.getByRole('button', { name: 'Check answer' }))
}

/** Start with the 9, then choose + and the 8. */
async function startAndChoose(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: 'Card 9' }))
  await user.click(await screen.findByRole('button', { name: 'Plus' }))
  await user.click(button('Card 8'))
}

test('a hand shows the target and five cards, and tapping a card starts the way', async () => {
  const user = userEvent.setup()
  renderPage()

  expect(await screen.findByText('Make 16. Tap a card to start.')).toBeTruthy()
  expect(screen.getByText('Hand 1 of 5 · You 0 · Robo 0')).toBeTruthy()
  expect(screen.getByLabelText('Target 16')).toBeTruthy()
  expect(within(screen.getByRole('group', { name: 'Your cards' })).getAllByRole('button')).toHaveLength(5)

  await user.click(button('Card 9'))

  expect(await screen.findByText('Tap + or −, then a card.')).toBeTruthy()
  expect(movesSent()).toEqual([{ type: 'start', card: 0 }])
  expect(button('Card 9').disabled).toBe(true)
})

test('a wrong step total shows the right one, resets the stars and opens the hint', async () => {
  const user = userEvent.setup()
  renderPage()
  await startAndChoose(user)
  expect(screen.getByText('What is 9 + 8?')).toBeTruthy()
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()

  await type(user, '16')

  expect(await screen.findByText('Not quite — 9 + 8 = 17.')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'step', sign: '+', card: 4, answer: 16 })
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(screen.getByText('9 + 8 = 17')).toBeTruthy()

  await user.click(button('Show me why'))
  expect(await screen.findByText(STEP_HINT)).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: counted on from start')).toBeTruthy()
})

test('a card that would take the total below 0 cannot be chosen', async () => {
  const user = userEvent.setup()
  replies.start = [{ correct: true, misconception: null, state: { way: [3], total: 1 } }]
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Card 1' }))
  await user.click(await screen.findByRole('button', { name: 'Minus' }))

  expect(button('Card 3').disabled).toBe(true)
  expect(button('Card 1').disabled).toBe(true)
  await user.click(button('Plus'))
  expect(button('Card 3').disabled).toBe(false)
})

test('making the target with every step right scores a point; a wrong step on the way does not', async () => {
  const user = userEvent.setup()
  replies.step = [
    { correct: true, misconception: null, state: { way: [0, 4], total: 17, steps: [step(9, '+', 8, 17, 17)] } },
    MADE_RIGHT,
  ]
  renderPage()
  await startAndChoose(user)
  await type(user, '17')
  await user.click(await screen.findByRole('button', { name: 'Minus' }))
  await user.click(button('Card 1'))
  await type(user, '16')

  expect(await screen.findByText('You made 16 with every step right: a point!')).toBeTruthy()
  expect(screen.getByText('Hand 1 of 5 · You 1 · Robo 0')).toBeTruthy()
})

test('a wrong step on the way still makes the target but scores no point', async () => {
  const user = userEvent.setup()
  replies.step = [
    { correct: false, misconception: 'counted_on_from_start', state: { way: [0, 4], total: 17, steps: [step(9, '+', 8, 16, 17)] } },
    { ...MADE_RIGHT, state: { ...MADE_RIGHT.state, steps: [step(9, '+', 8, 16, 17), step(17, '-', 1, 16, 16)] } },
  ]
  renderPage()
  await startAndChoose(user)
  await type(user, '16')
  await user.click(await screen.findByRole('button', { name: 'Minus' }))
  await user.click(button('Card 1'))
  await type(user, '16')

  expect(await screen.findByText('You made 16! One step was wrong, so no point this hand.')).toBeTruthy()
  expect(screen.getByText('Hand 1 of 5 · You 0 · Robo 0')).toBeTruthy()
})

test('Start over puts the cards back, and Show me a way ends the hand without a point', async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Card 9' }))
  await user.click(await screen.findByRole('button', { name: 'Start over' }))
  expect(await screen.findByText('Make 16. Tap a card to start.')).toBeTruthy()

  await user.click(button('Show me a way'))
  expect(await screen.findByText("Here's a way:")).toBeTruthy()
  expect(screen.getByText('8 + 8 = 16')).toBeTruthy()
  expect(movesSent().map((move) => move.type)).toEqual(['start', 'start_over', 'show_way'])
})

test("Robo's turn scores Robo's way, then the equation question is graded with a hint", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Show me a way' }))
  await user.click(await screen.findByRole('button', { name: "Robo's turn" }))

  expect(screen.getByText('7 + 9 = 16')).toBeTruthy()
  expect(screen.getByText('Hand 1 of 5 · You 0 · Robo 1')).toBeTruthy()
  expect(screen.getByText('What number makes this true?')).toBeTruthy()
  expect(screen.getByLabelText('16 = 2 + box')).toBeTruthy()

  hint = EQUATION_HINT
  await type(user, '18')
  expect(await screen.findByText('Not quite — the box is 14: 16 = 2 + 14.')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'equation', answer: 18 })
  await user.click(button('Show me why'))
  expect(await screen.findByText(EQUATION_HINT)).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: added all numbers')).toBeTruthy()

  await user.click(button('Next hand'))
  expect(await screen.findByText('Hand 2 of 5 · You 0 · Robo 1')).toBeTruthy()
  expect(deals).toBe(2)
})

test('after hand 5, See who won shows the result and Play again starts over', async () => {
  const user = userEvent.setup()
  renderPage()
  for (let hand = 1; hand <= 5; hand += 1) {
    replies.show_way = [{ correct: true, misconception: null, state: { shown_way: ['9 + 7 = 16'], done: true, robo: { ...ROBO, way: null }, equation: EQUATION } }]
    replies.equation = [
      { correct: true, misconception: null, state: { shown_way: ['9 + 7 = 16'], done: true, robo: { ...ROBO, way: null }, equation: EQUATION, equation_answer: 14, equation_value: 14 } },
    ]
    await user.click(await screen.findByRole('button', { name: 'Show me a way' }))
    await user.click(await screen.findByRole('button', { name: "Robo's turn" }))
    expect(screen.getByText("Robo couldn't find a way to make 16.")).toBeTruthy()
    await type(user, '14')
    await screen.findByText('Right! 16 = 2 + 14.')
    if (hand < 5) await user.click(button('Next hand'))
  }

  await user.click(button('See who won'))
  expect(screen.getByText("It's a draw!")).toBeTruthy()
  await user.click(button('Play again'))
  expect(await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')).toBeTruthy()
})
