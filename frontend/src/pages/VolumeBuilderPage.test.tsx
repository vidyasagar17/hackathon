import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import VolumeBuilderPage from './VolumeBuilderPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const COUNT_HINT = '18 is the cubes you can see. 6 more cubes are hidden behind and under them.'
const BUILD_HINT = '24 is the squares you can see on your box\'s top, front and side, not its cubes.'

type Reply = { correct: boolean; misconception: string | null; state: Record<string, unknown> }

let replies: Record<string, Reply[]> = {}
let hint = COUNT_HINT
let deals = 0
/** While set, deal replies wait until the test calls it, like a slow network. */
let releaseDeal: (() => void) | null = null
let holdDeals = false

const ROBO = { box: [2, 3, 4], layer: 6, layers: 4, volume: 24, built: [2, 6, 2] }

function state(update: Record<string, unknown> = {}) {
  return { level: 1, step: 'count', box: [4, 3, 2], count: null, volume: null, built: null, built_volume: null, robo: null, ...update }
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/volume-builder/rounds')) {
    deals += 1
    const payload = {
      round_id: `round-${deals}`,
      visible_state: state(),
      progress: { level: 1, correct_in_a_row: 2, needed: 3, top_level: 3 },
    }
    if (!holdDeals) return jsonResponse(payload)
    return new Promise((resolve) => {
      releaseDeal = () => resolve(jsonResponse(payload))
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

const RIGHT_COUNT: Reply = { correct: true, misconception: null, state: { step: 'build', count: 24, volume: 24 } }
const RIGHT_BUILD: Reply = {
  correct: true,
  misconception: null,
  state: { step: 'done', count: 24, volume: 24, built: [6, 2, 2], built_volume: 24, robo: ROBO },
}

beforeEach(() => {
  replies = {
    count: [{ correct: false, misconception: 'counted_visible_cubes', state: { step: 'build', count: 18, volume: 24 } }],
    build: [RIGHT_BUILD],
  }
  hint = COUNT_HINT
  deals = 0
  holdDeals = false
  releaseDeal = null
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
    <MemoryRouter initialEntries={['/curriculum/volume-builder']}>
      <Routes>
        <Route path="/curriculum/volume-builder" element={<VolumeBuilderPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function button(name: string | RegExp) {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

async function typeCount(user: UserEvent, digits: string) {
  const keypad = within(screen.getByRole('group', { name: 'Number keypad' }))
  for (const digit of digits) await user.click(keypad.getByRole('button', { name: digit }))
  await user.click(keypad.getByRole('button', { name: 'Check answer' }))
}

/** Count right, then open the building step. */
async function countThenBuild(user: UserEvent) {
  replies.count = [RIGHT_COUNT]
  await typeCount(user, '24')
  await user.click(await screen.findByRole('button', { name: 'Build a box' }))
}

test('a turn starts with the box to count and the keypad', async () => {
  renderPage()

  expect(await screen.findByText("How many cubes build this box? It's full inside.")).toBeTruthy()
  expect(screen.getByText('Turn 1 of 5 · You 0 · Robo 0')).toBeTruthy()
  expect(screen.getByRole('img', { name: 'A box of cubes 4 long, 3 wide and 2 tall' })).toBeTruthy()
  expect(button('Check answer').disabled).toBe(true)
})

test('a wrong count shows the real number, resets the stars and opens the hint with the top layer shaded', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("How many cubes build this box? It's full inside.")
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()

  await typeCount(user, '18')

  expect(await screen.findByText('Not quite — this box has 24 cubes.')).toBeTruthy()
  expect(movesSent()).toEqual([{ type: 'count', answer: 18 }])
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(screen.getByText('Turn 1 of 5 · You 0 · Robo 0')).toBeTruthy()

  await user.click(button('Show me why'))
  expect(await screen.findByText(COUNT_HINT)).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: counted visible cubes')).toBeTruthy()
  expect(screen.getByRole('img', { name: 'A box of cubes 4 long, 3 wide and 2 tall, with the top layer shaded' })).toBeTruthy()
})

test('a one-layer count shades the layer the student counted', async () => {
  const user = userEvent.setup()
  replies.count = [{ correct: false, misconception: 'counted_one_layer', state: { step: 'build', count: 8, volume: 24 } }]
  hint = '8 is only the front layer: 4 × 2 = 8.'
  renderPage()
  await screen.findByText("How many cubes build this box? It's full inside.")

  await typeCount(user, '8')
  await user.click(await screen.findByRole('button', { name: 'Show me why' }))

  expect(await screen.findByRole('img', { name: /with the front layer shaded/ })).toBeTruthy()
})

test('a right count scores a point, and building starts from the same box with Check off', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("How many cubes build this box? It's full inside.")

  await countThenBuild(user)

  expect(screen.getByText('Turn 1 of 5 · You 1 · Robo 0')).toBeTruthy()
  expect(screen.getByText('Build a different box with 24 cubes.')).toBeTruthy()
  expect(screen.getByText('Your box: 4 × 3 × 2')).toBeTruthy()
  expect(screen.getByText("That's the same box. Change an edge.")).toBeTruthy()
  expect(button('Check my box').disabled).toBe(true)
})

test('the edge buttons change the drawing and stop at 1 and 10', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("How many cubes build this box? It's full inside.")
  await countThenBuild(user)

  await user.click(button('Make the height smaller'))
  expect(screen.getByRole('img', { name: 'A box of cubes 4 long, 3 wide and 1 tall' })).toBeTruthy()
  expect(button('Make the height smaller').disabled).toBe(true)
  for (let tap = 0; tap < 6; tap += 1) await user.click(button('Make the length bigger'))
  expect(screen.getByText('Your box: 10 × 3 × 1')).toBeTruthy()
  expect(button('Make the length bigger').disabled).toBe(true)
  expect(button('Check my box').disabled).toBe(false)
})

test('a right build scores, and a wrong build says what the box holds and hints about it', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("How many cubes build this box? It's full inside.")
  await countThenBuild(user)
  await user.click(button('Make the length bigger'))
  await user.click(button('Make the length bigger'))
  await user.click(button('Make the width smaller'))
  await user.click(button('Check my box'))

  expect(await screen.findByText('Right! 6 × 2 × 2 = 24 cubes.')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'build', box: [6, 2, 2] })
  expect(screen.getByText('Turn 1 of 5 · You 2 · Robo 0')).toBeTruthy()
})

test('a wrong build shows its own box with the hint', async () => {
  const user = userEvent.setup()
  replies.build = [
    {
      correct: false,
      misconception: 'counted_visible_faces',
      state: { step: 'done', count: 24, volume: 24, built: [2, 3, 2], built_volume: 12, robo: ROBO },
    },
  ]
  renderPage()
  await screen.findByText("How many cubes build this box? It's full inside.")
  await countThenBuild(user)
  await user.click(button('Make the length smaller'))
  await user.click(button('Make the length smaller'))
  await user.click(button('Check my box'))

  expect(await screen.findByText('Not quite — your box holds 12 cubes, not 24.')).toBeTruthy()
  hint = BUILD_HINT
  await user.click(button('Show me why'))
  expect(await screen.findByText(BUILD_HINT)).toBeTruthy()
  expect(screen.getByRole('img', { name: 'A box of cubes 2 long, 3 wide and 2 tall, with the top layer shaded' })).toBeTruthy()
})

test("Robo's turn shows Robo counting by layers and its box, then Next turn deals a new box", async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("How many cubes build this box? It's full inside.")
  await countThenBuild(user)
  await user.click(button('Make the height smaller'))
  await user.click(button('Check my box'))
  await user.click(await screen.findByRole('button', { name: "Robo's turn" }))

  expect(screen.getByText('Robo counted 6 cubes in the top layer and 4 layers: 4 × 6 = 24.')).toBeTruthy()
  expect(screen.getByText('Robo built a 2 × 6 × 2 box with 24 cubes too.')).toBeTruthy()
  expect(screen.getByRole('img', { name: 'A box of cubes 2 long, 3 wide and 4 tall, with the top layer shaded' })).toBeTruthy()
  expect(screen.getByText('Turn 1 of 5 · You 2 · Robo 2')).toBeTruthy()

  await user.click(button('Next turn'))
  expect(await screen.findByText('Turn 2 of 5 · You 2 · Robo 2')).toBeTruthy()
  expect(screen.getByText("How many cubes build this box? It's full inside.")).toBeTruthy()
  expect(deals).toBe(2)
})

test('a double tap on Next turn deals only one new box', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("How many cubes build this box? It's full inside.")
  await countThenBuild(user)
  await user.click(button('Make the height smaller'))
  await user.click(button('Check my box'))
  await user.click(await screen.findByRole('button', { name: "Robo's turn" }))

  holdDeals = true
  await user.dblClick(button('Next turn'))
  releaseDeal?.()

  expect(await screen.findByText('Turn 2 of 5 · You 2 · Robo 2')).toBeTruthy()
  expect(deals).toBe(2)
})

test('after turn 5, See who won shows the result and Play again starts over', async () => {
  const user = userEvent.setup()
  renderPage()
  await screen.findByText("How many cubes build this box? It's full inside.")
  for (let turn = 1; turn <= 5; turn += 1) {
    replies.build = [{ ...RIGHT_BUILD, state: { ...RIGHT_BUILD.state, robo: { ...ROBO, built: null } } }]
    await countThenBuild(user)
    await user.click(button('Make the height smaller'))
    await user.click(button('Check my box'))
    await user.click(await screen.findByRole('button', { name: "Robo's turn" }))
    if (turn < 5) await user.click(button('Next turn'))
  }

  expect(screen.getByText("Robo couldn't find a different box with 24 cubes.")).toBeTruthy()
  await user.click(button('See who won'))
  expect(screen.getByText('You win the game!')).toBeTruthy()
  expect(screen.getByText('You 10 · Robo 5')).toBeTruthy()

  await user.click(button('Play again'))
  expect(await screen.findByText('Turn 1 of 5 · You 0 · Robo 0')).toBeTruthy()
})
