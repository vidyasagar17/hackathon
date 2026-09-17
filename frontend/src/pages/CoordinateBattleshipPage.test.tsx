import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import CoordinateBattleshipPage from './CoordinateBattleshipPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const WRITE_HINT = 'Across comes first, then up. Your aim is 3 across and 5 up, so it is (3, 5), not (5, 3).'
const READ_HINT = '(2, 4) means 2 across first, then 4 up. You went 4 across and 2 up.'

type Reply = { correct: boolean; misconception: string | null; state: Record<string, unknown> }

let replies: Record<string, Reply[]> = {}
let hint = WRITE_HINT
let movesFail = false
let deals = 0

function state(update: Record<string, unknown> = {}) {
  return {
    level: 2,
    size: 5,
    turns: 8,
    turn: 1,
    step: 'aim',
    robo_ocean: { shots: [], sunk: [], ships: null },
    my_ocean: { ships: [[[1, 1], [2, 1], [3, 1]], [[5, 3], [5, 4]]], shots: [] },
    aim: null,
    written: null,
    robo_call: null,
    tapped: null,
    my_hits: 0,
    robo_hits: 0,
    fleet: 2,
    my_sunk: 0,
    robo_sunk: 0,
    winner: null,
    ...update,
  }
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/coordinate-plane-battleship/rounds')) {
    deals += 1
    return jsonResponse({
      round_id: `round-${deals}`,
      visible_state: state(),
      progress: { level: 2, correct_in_a_row: 2, needed: 3, top_level: 3 },
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: null, hint, cards: null })
  if (movesFail) return jsonResponse({ detail: 'nope' }, false)
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

beforeEach(() => {
  replies = {
    aim: [{ correct: true, misconception: null, state: { step: 'write', aim: [3, 5] } }],
    write: [
      {
        correct: false,
        misconception: 'swapped_x_and_y',
        state: { step: 'pass', aim: [3, 5], written: [5, 3], robo_ocean: { shots: [{ x: 5, y: 3, hit: false }], sunk: [], ships: null } },
      },
    ],
    robo_turn: [{ correct: true, misconception: null, state: { step: 'read', robo_call: [2, 4] } }],
    read: [
      {
        correct: false,
        misconception: 'swapped_x_and_y',
        state: {
          step: 'aim',
          turn: 2,
          robo_call: [2, 4],
          tapped: [4, 2],
          my_ocean: { ships: [[[1, 1], [2, 1], [3, 1]], [[5, 3], [5, 4]]], shots: [{ x: 2, y: 4, hit: false }] },
        },
      },
    ],
  }
  hint = WRITE_HINT
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
    <MemoryRouter initialEntries={['/curriculum/coordinate-plane-battleship']}>
      <Routes>
        <Route path="/curriculum/coordinate-plane-battleship" element={<CoordinateBattleshipPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function button(name: string | RegExp) {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

async function writePair(user: UserEvent, x: number, y: number) {
  const numbers = within(screen.getByRole('group', { name: 'Number buttons' }))
  await user.click(numbers.getByRole('button', { name: String(x) }))
  await user.click(numbers.getByRole('button', { name: String(y) }))
}

test("a game starts on Robo's ocean with every point of the 0–5 grid to tap", async () => {
  renderPage()

  expect(await screen.findByText("Tap a point on Robo's ocean to aim.")).toBeTruthy()
  expect(screen.getByText("Robo's ocean · Turn 1 of 8 · Your hits 0 · Robo's hits 0")).toBeTruthy()
  const points = within(screen.getByRole('group', { name: "Robo's ocean" })).getAllByRole('button')
  expect(points).toHaveLength(36)
  expect(button('Point (0, 0)').disabled).toBe(false)
})

test('aiming then writing a swapped pair fires where the pair says, resets the stars and offers the hint', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("Tap a point on Robo's ocean to aim.")
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()

  await user.click(button('Point (3, 5)'))
  expect(await screen.findByText('Write the ordered pair for your aim, then fire.')).toBeTruthy()
  expect(button('Fire').disabled).toBe(true)
  await writePair(user, 5, 3)
  expect(screen.getByLabelText('Your pair: (5, 3)')).toBeTruthy()
  await user.click(button('Fire'))

  expect(await screen.findByText('Not quite — your aim was (3, 5), and you wrote (5, 3). Your shot at (5, 3): miss.')).toBeTruthy()
  expect(movesSent()).toEqual([{ type: 'aim', x: 3, y: 5 }, { type: 'write', x: 5, y: 3 }])
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Point (5, 3), miss' })).toBeTruthy()

  await user.click(button('Show me why'))
  expect(await screen.findByText(WRITE_HINT)).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: swapped x and y')).toBeTruthy()
})

test('Undo takes back the last number before firing', async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Point (3, 5)' }))
  await screen.findByText('Write the ordered pair for your aim, then fire.')

  await writePair(user, 3, 4)
  await user.click(button('Undo'))
  expect(screen.getByLabelText('Your pair: (3, )')).toBeTruthy()
  expect(button('Fire').disabled).toBe(true)
})

test("Robo's turn shows your ocean, reading its call is graded, and Next turn goes back to aiming", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Point (3, 5)' }))
  await screen.findByText('Write the ordered pair for your aim, then fire.')
  await writePair(user, 5, 3)
  await user.click(button('Fire'))
  await user.click(await screen.findByRole('button', { name: "Robo's turn" }))

  expect(await screen.findByText('Robo calls (2, 4). Tap that point on your ocean.')).toBeTruthy()
  expect(screen.getByRole('group', { name: 'Your ocean' })).toBeTruthy()
  expect(button('Point (1, 1), your ship')).toBeTruthy()

  hint = READ_HINT
  await user.click(button('Point (4, 2)'))

  expect(await screen.findByText('Not quite — Robo called (2, 4), and you tapped (4, 2). Robo\'s shot at (2, 4): miss.')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'read', x: 4, y: 2 })
  await user.click(button('Show me why'))
  expect(await screen.findByText(READ_HINT)).toBeTruthy()

  await user.click(button('Next turn'))
  expect(screen.getByRole('group', { name: "Robo's ocean" })).toBeTruthy()
  expect(screen.getByText("Tap a point on Robo's ocean to aim.")).toBeTruthy()
})

test('the end shows See who won, then the hits, the winner and Play again', async () => {
  replies.write = [
    {
      correct: true,
      misconception: null,
      state: {
        step: 'over',
        aim: [3, 5],
        written: [3, 5],
        my_hits: 5,
        robo_hits: 2,
        my_sunk: 2,
        winner: 'mine',
        robo_ocean: { shots: [{ x: 3, y: 5, hit: true }], sunk: [], ships: [[[3, 5], [4, 5]]] },
      },
    },
  ]
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: 'Point (3, 5)' }))
  await screen.findByText('Write the ordered pair for your aim, then fire.')
  await writePair(user, 3, 5)
  await user.click(button('Fire'))

  expect(await screen.findByText('Right! Your shot at (3, 5): hit!')).toBeTruthy()
  await user.click(button('See who won'))
  const result = within(screen.getByRole('group', { name: 'Game result' }))
  expect(result.getByText("Your hits 5 · Robo's hits 2")).toBeTruthy()
  expect(result.getByText('You win!')).toBeTruthy()

  await user.click(button('Play again'))
  expect(await screen.findByText("Tap a point on Robo's ocean to aim.")).toBeTruthy()
  expect(deals).toBe(2)
})

test('a move that fails to send says so', async () => {
  movesFail = true
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Point (3, 5)' }))

  expect(await screen.findByText("Couldn't send that — try again.")).toBeTruthy()
})
