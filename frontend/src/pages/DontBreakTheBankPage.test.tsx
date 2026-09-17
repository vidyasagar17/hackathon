import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import DontBreakTheBankPage from './DontBreakTheBankPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const SUM_HINT = 'In the ones column, 6 + 5 + 3 makes 14, so write 4 and carry 1 to the tens column.'
const DISTANCE_HINT =
  'When a column borrows, the column it borrows from goes down by 1: 1000 is 9 hundreds, 9 tens and 10 ones, so 1000 − 984 = 16.'
const FULL = [4, 5, 6, 3, 6, 5, 1, 6, 3]
const EMPTY = Array(9).fill(null)

type Reply = { correct: boolean; misconception: string | null; state: Record<string, unknown> }

let replies: Record<string, Reply[]> = {}
let hint = SUM_HINT
let movesFail = false
let deals = 0

function state(update: Record<string, unknown> = {}) {
  return {
    level: 2,
    numbers: 3,
    width: 3,
    bank: 1000,
    die: 'six',
    step: 'place',
    roll: 4,
    rolls_left: 9,
    my_board: EMPTY,
    robo_board: EMPTY,
    robo_last_spot: null,
    my_numbers: null,
    sum_answer: null,
    my_total: null,
    broke: null,
    distance_answer: null,
    my_distance: null,
    robo_numbers: null,
    robo_total: null,
    robo_distance: null,
    winner: null,
    ...update,
  }
}

const SUM_STEP = { step: 'sum', roll: null, rolls_left: 0, my_board: FULL, robo_board: [1, 5, 4, 1, 6, 6, 3, 6, 3], my_numbers: [456, 365, 163] }

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/dont-break-the-bank/rounds')) {
    deals += 1
    const start = deals === 1 ? startState : state()
    return jsonResponse({
      round_id: `round-${deals}`,
      visible_state: start,
      progress: { level: 2, correct_in_a_row: 2, needed: 3, top_level: 3 },
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: null, hint, cards: null })
  if (movesFail) return jsonResponse({ detail: 'nope' }, false)
  const { move } = JSON.parse(String(init?.body))
  const reply = replies[move.type].shift() as Reply
  return jsonResponse({ correct: reply.correct, misconception: reply.misconception, visible_state: state(reply.state) })
}

let startState: Record<string, unknown> = state()

function callsTo(ending: string) {
  return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith(ending))
}

function movesSent() {
  return callsTo('/moves').map(([, init]) => JSON.parse(String(init?.body)).move)
}

beforeEach(() => {
  replies = {}
  hint = SUM_HINT
  movesFail = false
  deals = 0
  startState = state()
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
    <MemoryRouter initialEntries={['/curriculum/dont-break-the-bank']}>
      <Routes>
        <Route path="/curriculum/dont-break-the-bank" element={<DontBreakTheBankPage />} />
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
}

test('placing: the roll shows as a die, empty spots are named by number and place, and Robo places the same roll', async () => {
  replies.place = [
    {
      correct: true,
      misconception: null,
      state: { roll: 5, rolls_left: 8, my_board: [4, ...EMPTY.slice(1)], robo_board: [4, ...EMPTY.slice(1)], robo_last_spot: 0 },
    },
  ]
  const user = userEvent.setup()
  renderPage()

  expect(await screen.findByText('You rolled a 4. Tap a spot for it.')).toBeTruthy()
  expect(screen.getByRole('img', { name: '4 dots' })).toBeTruthy()
  expect(screen.getByText('Bank: 1000')).toBeTruthy()
  const spots = within(screen.getByRole('group', { name: 'Your numbers' })).getAllByRole('button')
  expect(spots).toHaveLength(9)
  expect(spots[4].getAttribute('aria-label')).toBe('Number 2, tens')

  await user.click(button('Number 1, hundreds'))

  expect(await screen.findByText('You rolled a 5. Tap a spot for it.')).toBeTruthy()
  expect(movesSent()).toEqual([{ type: 'place', spot: 0 }])
  expect(screen.getByLabelText('Number 1, hundreds: 4')).toBeTruthy()
  expect(screen.getByText('Robo put its 4 in the hundreds of number 1.')).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('tap')
})

test('a 0–9 die shows its roll as a number card', async () => {
  startState = state({ level: 3, die: 'ten', roll: 0 })
  renderPage()

  expect(await screen.findByText('You rolled a 0. Tap a spot for it.')).toBeTruthy()
  expect(screen.queryByRole('img', { name: /dots?$/ })).toBeNull()
})

test('a wrong sum shows the right one, resets the stars, offers the hint, then asks how far from the bank', async () => {
  startState = state(SUM_STEP)
  replies.sum = [
    {
      correct: false,
      misconception: 'no_carry',
      state: { ...SUM_STEP, step: 'distance', sum_answer: 874, my_total: 984, broke: false },
    },
  ]
  replies.distance = [
    {
      correct: false,
      misconception: 'stops_borrow_at_zero',
      state: { ...SUM_STEP, step: 'pass', sum_answer: 874, my_total: 984, broke: false, distance_answer: 1126, my_distance: 16 },
    },
  ]
  const user = userEvent.setup()
  renderPage()
  expect(await screen.findByText('Add your numbers.')).toBeTruthy()
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()

  await type(user, '0874')
  expect(screen.getByLabelText('Your sum: 874')).toBeTruthy()
  await user.click(button('Check answer'))

  expect(await screen.findByText('Not quite — 456 + 365 + 163 = 984.')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'sum', answer: 874 })
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(callsTo('/hint')).toHaveLength(0)

  await user.click(button('Show me why'))
  expect(await screen.findByText(SUM_HINT)).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: no carry')).toBeTruthy()

  await user.click(button('How far from 1000?'))
  expect(screen.queryByText(SUM_HINT)).toBeNull()
  expect(screen.getByRole('group', { name: '1000 take away 984' })).toBeTruthy()
  expect(screen.getByText('How far is 984 from 1000?')).toBeTruthy()

  hint = DISTANCE_HINT
  await type(user, '1126')
  await user.click(button('Check answer'))

  expect(await screen.findByText('Not quite — 1000 − 984 = 16.')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'distance', answer: 1126 })
  await user.click(button('Show me why'))
  expect(await screen.findByText(DISTANCE_HINT)).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: stops borrow at zero')).toBeTruthy()
  expect(button("Robo's turn")).toBeTruthy()
})

test('typing ignores leading zeros, stops at six digits and deletes', async () => {
  startState = state(SUM_STEP)
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Add your numbers.')
  expect(button('Check answer').disabled).toBe(true)

  await type(user, '00123456789')
  expect(screen.getByLabelText('Your sum: 123456')).toBeTruthy()
  await user.click(button('Delete'))
  expect(screen.getByLabelText('Your sum: 12345')).toBeTruthy()
})

test('a sum over the bank says the bank broke and goes straight to Robo', async () => {
  startState = state({ ...SUM_STEP, my_board: [6, 6, 6, 5, 5, 5, 1, 1, 1], my_numbers: [666, 555, 111] })
  replies.sum = [
    {
      correct: true,
      misconception: null,
      state: { ...SUM_STEP, my_board: [6, 6, 6, 5, 5, 5, 1, 1, 1], my_numbers: [666, 555, 111], step: 'pass', sum_answer: 1332, my_total: 1332, broke: true },
    },
  ]
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('Add your numbers.')

  await type(user, '1332')
  await user.click(button('Check answer'))

  expect(await screen.findByText('Right! 666 + 555 + 111 = 1332.')).toBeTruthy()
  expect(screen.getByText('1332 is more than 1000 — you broke the bank.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'How far from 1000?' })).toBeNull()
  expect(button("Robo's turn")).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('correct')
})

test("Robo's turn shows Robo's sum, See who won names the winner, and Play again starts a new game", async () => {
  const done = { ...SUM_STEP, sum_answer: 984, my_total: 984, broke: false, distance_answer: 16, my_distance: 16 }
  startState = state({ ...done, step: 'pass' })
  replies.robo_turn = [
    {
      correct: true,
      misconception: null,
      state: { ...done, step: 'over', robo_numbers: [154, 166, 363], robo_total: 683, robo_distance: 317, winner: 'mine' },
    },
  ]
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: "Robo's turn" }))

  expect(await screen.findByText("Robo's numbers make 154 + 166 + 363 = 683. That is 317 away from 1000.")).toBeTruthy()
  expect(screen.queryByText('You win!')).toBeNull()

  await user.click(button('See who won'))

  const result = within(screen.getByRole('group', { name: 'Game result' }))
  expect(result.getByText('You made 984: 16 away.')).toBeTruthy()
  expect(result.getByText('You win!')).toBeTruthy()

  await user.click(button('Play again'))
  expect(await screen.findByText('You rolled a 4. Tap a spot for it.')).toBeTruthy()
  expect(deals).toBe(2)
})

test('a move that fails to send says so', async () => {
  movesFail = true
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Number 1, hundreds' }))

  expect(await screen.findByText("Couldn't send that — try again.")).toBeTruthy()
})
