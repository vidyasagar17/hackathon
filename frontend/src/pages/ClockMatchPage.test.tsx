import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import ClockMatchPage from './ClockMatchPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const HINT = "The minute hand on the 10 means 50 minutes, so it isn't 3 o'clock yet."
const READ_CHOICES = [[2, 10], [2, 50], [3, 50], [10, 15]]
const SET_CHOICES = [[120, 50], [170, 50], [230, 50], [600, 10]]
const ROBO = { kind: 'set', time: [7, 45], clock: [465, 45], knows: true }

let kind = 'read'
let deals = 0
let reply: { correct: boolean; misconception: string | null; state: Record<string, unknown> }

function state(update: Record<string, unknown> = {}) {
  const read = kind === 'read'
  return {
    level: 3,
    kind,
    time: read ? null : [2, 50],
    clock: read ? [170, 50] : null,
    choices: read ? READ_CHOICES : SET_CHOICES,
    pick: null,
    right: null,
    robo: null,
    ...update,
  }
}

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/clock-match/rounds')) {
    deals += 1
    return jsonResponse({ round_id: `round-${deals}`, visible_state: state(), progress: { level: 3, correct_in_a_row: 2, needed: 3, top_level: 3 } })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: 'read_the_next_hour', hint: HINT, cards: null })
  expect(JSON.parse(String(init?.body)).move.type).toBe('pick')
  return jsonResponse({ correct: reply.correct, misconception: reply.misconception, visible_state: state(reply.state) })
}

function movesSent() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([url]) => String(url).endsWith('/moves'))
    .map(([, init]) => JSON.parse(String(init?.body)).move)
}

beforeEach(() => {
  kind = 'read'
  deals = 0
  reply = { correct: false, misconception: 'read_the_next_hour', state: { pick: 2, right: 1, time: [2, 50], robo: ROBO } }
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
    <MemoryRouter initialEntries={['/curriculum/clock-match']}>
      <Routes>
        <Route path="/curriculum/clock-match" element={<ClockMatchPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function choice(name: string | RegExp) {
  return within(screen.getByRole('group', { name: 'Choices' })).getByRole('button', { name }) as HTMLButtonElement
}

test('a clock to read shows the clock and four time cards without saying the time', async () => {
  renderPage()

  expect(await screen.findByText('What time is it?')).toBeTruthy()
  expect(screen.getByText('Turn 1 of 8 · You 0 · Robo 0')).toBeTruthy()
  expect(screen.getByRole('img', { name: 'The clock to read' })).toBeTruthy()
  expect(within(screen.getByRole('group', { name: 'Choices' })).getAllByRole('button').map((button) => button.textContent)).toEqual([
    '2:10',
    '2:50',
    '3:50',
    '10:15',
  ])
})

test('a wrong reading resets the stars, outlines the right card and opens the hint', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText('What time is it?')
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()

  await user.click(choice('3:50'))

  expect(await screen.findByText('Not quite — this clock shows 2:50.')).toBeTruthy()
  expect(movesSent()).toEqual([{ type: 'pick', choice: 2 }])
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(choice('2:50, the right answer')).toBeTruthy()
  expect(choice('3:50').disabled).toBe(true)

  await user.click(screen.getByRole('button', { name: 'Show me why' }))
  expect(await screen.findByText(HINT)).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: read the next hour')).toBeTruthy()
})

test('a time to set shows the time and four clocks; a right pick scores', async () => {
  const user = userEvent.setup()
  kind = 'set'
  reply = { correct: true, misconception: null, state: { pick: 1, right: 1, robo: ROBO } }
  renderPage()

  expect(await screen.findByText('Which clock shows 2:50?')).toBeTruthy()
  expect(within(screen.getByRole('group', { name: 'Choices' })).getAllByRole('img')).toHaveLength(4)
  await user.click(choice('Clock 2'))

  expect(await screen.findByText('Right! That clock shows 2:50.')).toBeTruthy()
  expect(screen.getByText('Turn 1 of 8 · You 1 · Robo 0')).toBeTruthy()
})

test("Robo's turn shows Robo's card and scores it, then Next turn deals a new card", async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: '3:50' }))
  await user.click(await screen.findByRole('button', { name: "Robo's turn" }))

  expect(screen.getByText('Robo picked the clock for 7:45. Right!')).toBeTruthy()
  expect(screen.getByText('Turn 1 of 8 · You 0 · Robo 1')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Next turn' }))
  expect(await screen.findByText('Turn 2 of 8 · You 0 · Robo 1')).toBeTruthy()
  expect(deals).toBe(2)
})

test('after turn 8, See who won shows the result and Play again starts over', async () => {
  const user = userEvent.setup()
  reply = { correct: true, misconception: null, state: { pick: 1, right: 1, time: [2, 50], robo: { ...ROBO, knows: false } } }
  renderPage()
  for (let turn = 1; turn <= 8; turn += 1) {
    await user.click(await screen.findByRole('button', { name: '2:50' }))
    await user.click(await screen.findByRole('button', { name: "Robo's turn" }))
    if (turn < 8) await user.click(screen.getByRole('button', { name: 'Next turn' }))
  }

  expect(screen.getByText("Robo wasn't sure which clock shows 7:45.")).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'See who won' }))
  expect(screen.getByText('You win the game!')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Play again' }))
  expect(await screen.findByText('Turn 1 of 8 · You 0 · Robo 0')).toBeTruthy()
})
