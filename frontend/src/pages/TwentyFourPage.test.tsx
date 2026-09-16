import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import TwentyFourPage from './TwentyFourPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

type Shown = { text: string; steps: string[]; value: string | null }

const HINT =
  'In 3 + 5 × 3 × 1, × and ÷ come before + and −, so it makes 18. Parentheses show the order you used: (3 + 5) × 3 × 1 = 24.'

const WRONG_CHECK: Shown = { text: '3 + 5 × 3 × 1', steps: ['5 × 3 = 15', '15 × 1 = 15', '3 + 15 = 18'], value: '18' }
const RIGHT_CHECK: Shown = { text: '(3 + 5) × 3 × 1', steps: ['3 + 5 = 8', '8 × 3 = 24', '24 × 1 = 24'], value: '24' }
const ROBO_WAY: Shown = { text: '(7 × 7 − 1) ÷ 2', steps: ['7 × 7 = 49', '49 − 1 = 48', '48 ÷ 2 = 24'], value: '24' }

let checkReply: { correct: boolean; misconception: string | null; last_check: Shown } = {
  correct: false,
  misconception: 'left_to_right',
  last_check: WRONG_CHECK,
}
let roboWay: Shown | null = ROBO_WAY
let movesFail = false
let deals = 0

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function visibleState(update: Record<string, unknown> = {}) {
  return {
    level: 2,
    cards: [3, 5, 3, 1],
    checks: 0,
    last_check: null,
    made_24: false,
    shown_way: null,
    done: false,
    robo_cards: null,
    robo_way: null,
    ...update,
  }
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/the-24-game/rounds')) {
    deals += 1
    return jsonResponse({
      round_id: `round-${deals}`,
      visible_state: visibleState(),
      progress: { level: 2, correct_in_a_row: 2, needed: 3, top_level: 3 },
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: 'left_to_right', hint: HINT, cards: null })
  if (movesFail) return jsonResponse({ detail: 'nope' }, false)
  const { move } = JSON.parse(String(init?.body))
  const robo = { robo_cards: [1, 2, 7, 7], robo_way: roboWay }
  if (move.type === 'show_way') {
    return jsonResponse({
      correct: true,
      misconception: null,
      visible_state: visibleState({ shown_way: RIGHT_CHECK, done: true, ...robo }),
    })
  }
  const { correct, misconception, last_check } = checkReply
  return jsonResponse({
    correct,
    misconception,
    visible_state: visibleState({
      checks: 1,
      last_check,
      made_24: correct,
      done: correct,
      ...(correct ? robo : {}),
    }),
  })
}

function callsTo(ending: string) {
  return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith(ending))
}

function movesSent() {
  return callsTo('/moves').map(([, init]) => JSON.parse(String(init?.body)).move)
}

beforeEach(() => {
  checkReply = { correct: false, misconception: 'left_to_right', last_check: WRONG_CHECK }
  roboWay = ROBO_WAY
  movesFail = false
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
    <MemoryRouter initialEntries={['/curriculum/the-24-game']}>
      <Routes>
        <Route path="/curriculum/the-24-game" element={<TwentyFourPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function cards() {
  return within(screen.getByRole('group', { name: 'Your cards' })).getAllByRole('button') as HTMLButtonElement[]
}

function button(name: string) {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

function expression() {
  return screen.getByLabelText(/^Your expression:/)
}

/** Tap 3 + 5 × 3 × 1, or with parentheses (3 + 5) × 3 × 1. */
async function build(user: UserEvent, withParentheses: boolean) {
  const [three, five, otherThree, one] = cards()
  if (withParentheses) await user.click(button('Open parenthesis'))
  await user.click(three)
  await user.click(button('plus'))
  await user.click(five)
  if (withParentheses) await user.click(button('Close parenthesis'))
  await user.click(button('times'))
  await user.click(otherThree)
  await user.click(button('times'))
  await user.click(one)
}

test('a hand deals four cards, the score line and a Check that waits for a whole expression', async () => {
  renderPage()

  expect(await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')).toBeTruthy()
  expect(cards().map((card) => card.getAttribute('aria-label'))).toEqual(['Card 3', 'Card 5', 'Card 3', 'Card 1'])
  expect(button('Check').disabled).toBe(true)
  expect(button('plus').disabled).toBe(true)
  expect(button('Close parenthesis').disabled).toBe(true)
  expect(expression().getAttribute('aria-label')).toBe('Your expression: empty')
})

test('tapping cards, signs and parentheses builds the expression; each card once; Undo and Clear edit it', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')

  await user.click(button('Open parenthesis'))
  await user.click(cards()[0])
  expect(cards()[0].disabled).toBe(true)
  expect(cards()[1].disabled).toBe(true)
  await user.click(button('plus'))
  expect(cards()[0].disabled).toBe(true)
  expect(cards()[1].disabled).toBe(false)
  await user.click(cards()[1])
  expect(expression().textContent).toBe('(3 + 5')

  await user.click(button('Undo'))
  expect(expression().textContent).toBe('(3 +')
  await user.click(button('Clear'))
  expect(expression().textContent).toBe('')

  await build(user, true)
  expect(expression().textContent).toBe('(3 + 5) × 3 × 1')
  expect(button('Check').disabled).toBe(false)
  expect(playSound).toHaveBeenCalledWith('tap')
})

test('a wrong check shows what it makes with its steps, resets the stars, and offers the hint on Show me why', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()
  await build(user, false)

  await user.click(button('Check'))

  expect(await screen.findByText('Not quite — 3 + 5 × 3 × 1 makes 18, not 24.')).toBeTruthy()
  expect(movesSent()).toEqual([{ type: 'check', tokens: [0, '+', 1, '*', 2, '*', 3] }])
  const steps = within(screen.getByRole('list', { name: 'Steps for 3 + 5 × 3 × 1' })).getAllByRole('listitem')
  expect(steps.map((step) => step.textContent)).toEqual(['5 × 3 = 15', '15 × 1 = 15', '3 + 15 = 18'])
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(callsTo('/hint')).toHaveLength(0)
  expect(expression().textContent).toBe('3 + 5 × 3 × 1')

  await user.click(button('Show me why'))

  expect(await screen.findByText(HINT)).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: left to right')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Show me why' })).toBeNull()
})

test("a check that divides by 0 says it can't be done", async () => {
  checkReply = {
    correct: false,
    misconception: null,
    last_check: { text: '5 ÷ (3 − 3) + 1', steps: ['3 − 3 = 0'], value: null },
  }
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')
  await build(user, false)

  await user.click(button('Check'))

  expect(await screen.findByText("Not quite — 5 ÷ (3 − 3) + 1 divides by 0, which can't be done.")).toBeTruthy()
})

test('making 24 scores a point, ends building and hands the turn to Robo, who shows its way', async () => {
  checkReply = { correct: true, misconception: null, last_check: RIGHT_CHECK }
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')
  await build(user, true)

  await user.click(button('Check'))

  expect(await screen.findByText('You made 24! (3 + 5) × 3 × 1 = 24.')).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('correct')
  expect(screen.getByText('Hand 1 of 5 · You 1 · Robo 0')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Check' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Show me a way' })).toBeNull()
  expect(screen.queryByRole('group', { name: /Robo's cards/ })).toBeNull()

  await user.click(button("Robo's turn"))

  expect(screen.getByRole('group', { name: "Robo's cards: 1, 2, 7 and 7" })).toBeTruthy()
  expect(screen.getByText('Robo made 24: (7 × 7 − 1) ÷ 2')).toBeTruthy()
  expect(screen.getByText('7 × 7 = 49, then 49 − 1 = 48, then 48 ÷ 2 = 24')).toBeTruthy()
  expect(screen.getByText('Hand 1 of 5 · You 1 · Robo 1')).toBeTruthy()
  expect(screen.queryByText(/You made 24/)).toBeNull()
})

test('Show me a way is not graded, shows a way with its steps and scores nothing', async () => {
  roboWay = null
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')

  await user.click(button('Show me a way'))

  expect(await screen.findByText("Here's a way: (3 + 5) × 3 × 1 = 24")).toBeTruthy()
  expect(movesSent()).toEqual([{ type: 'show_way' }])
  expect(playSound).not.toHaveBeenCalledWith('correct')
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()

  await user.click(button("Robo's turn"))

  expect(screen.getByText("Robo couldn't find a way to make 24 with 1, 2, 7 and 7.")).toBeTruthy()
  expect(screen.getByText('Hand 1 of 5 · You 0 · Robo 0')).toBeTruthy()
  expect(screen.queryByText(/Here's a way/)).toBeNull()
})

test('Show me a way stays offered after a wrong check', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')
  await build(user, false)
  await user.click(button('Check'))
  await screen.findByText('Not quite — 3 + 5 × 3 × 1 makes 18, not 24.')

  expect(screen.getAllByRole('button', { name: 'Show me a way' })).toHaveLength(1)
})

test('Next hand deals a fresh hand and the fifth hand ends with See who won', async () => {
  checkReply = { correct: true, misconception: null, last_check: RIGHT_CHECK }
  const user = userEvent.setup()
  renderPage()

  for (let hand = 1; hand <= 5; hand += 1) {
    await screen.findByText(new RegExp(`^Hand ${hand} of 5`))
    await build(user, true)
    await user.click(button('Check'))
    await user.click(await screen.findByRole('button', { name: "Robo's turn" }))
    if (hand < 5) {
      expect(screen.queryByRole('button', { name: 'See who won' })).toBeNull()
      await user.click(button('Next hand'))
    }
  }
  await user.click(button('See who won'))

  const result = screen.getByRole('group', { name: 'Game result' })
  expect(within(result).getByText('You 5 · Robo 5')).toBeTruthy()
  expect(within(result).getByText("It's a draw!")).toBeTruthy()

  await user.click(button('Play again'))

  expect(await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')).toBeTruthy()
})

test('a move that fails to send says so', async () => {
  movesFail = true
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Hand 1 of 5 · You 0 · Robo 0')

  await user.click(button('Show me a way'))

  expect(await screen.findByText("Couldn't send your move — try again.")).toBeTruthy()
})
