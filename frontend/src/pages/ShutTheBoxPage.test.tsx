import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import ShutTheBoxPage from './ShutTheBoxPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const TOTAL_HINT = 'When you count on from 5, the first number you say is 6: 6, 7, 8.'
const SHUT_HINT = 'Start at 5 and count on: 6, 7, 8, 9. 5 and 4 make 9. You need 8.'
const NINE = [1, 2, 3, 4, 5, 6, 7, 8, 9]

type Reply = { correct: boolean; misconception: string | null; state: Record<string, unknown> }

let replies: Record<string, Reply> = {}
let hint = TOTAL_HINT
let movesFail = false
let deals = 0

function state(update: Record<string, unknown> = {}) {
  return {
    level: 2,
    faces: 6,
    tiles: 9,
    step: 'roll',
    my_open: NINE,
    robo_open: NINE,
    my_dice: null,
    choices: null,
    total_pick: null,
    my_total: null,
    can_shut: null,
    picked_tiles: null,
    shut_tiles: null,
    my_done: false,
    robo_done: false,
    robo_last: null,
    winner: null,
    ...update,
  }
}

const ROLLED = { step: 'total', my_dice: [3, 5], choices: [2, 6, 7, 8] }

function defaultReplies(): Record<string, Reply> {
  return {
    roll: { correct: true, misconception: null, state: ROLLED },
    total: { correct: true, misconception: null, state: { ...ROLLED, step: 'shut', total_pick: 8, my_total: 8, can_shut: true } },
    shut: {
      correct: true,
      misconception: null,
      state: { ...ROLLED, step: 'pass', total_pick: 8, my_total: 8, picked_tiles: [3, 5], shut_tiles: [3, 5], my_open: [1, 2, 4, 6, 7, 8, 9] },
    },
    robo_turn: {
      correct: true,
      misconception: null,
      state: { step: 'roll', my_open: [1, 2, 4, 6, 7, 8, 9], robo_open: [1, 2, 3, 4, 5, 6, 7, 9], robo_last: { dice: [2, 6], shut: [8] } },
    },
  }
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/shut-the-box/rounds')) {
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
  replies = defaultReplies()
  hint = TOTAL_HINT
  movesFail = false
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
    <MemoryRouter initialEntries={['/curriculum/shut-the-box']}>
      <Routes>
        <Route path="/curriculum/shut-the-box" element={<ShutTheBoxPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function button(name: string | RegExp) {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

function tile(number: number) {
  return within(screen.getByRole('group', { name: 'Your box' })).getByRole('button', { name: new RegExp(`^Tile ${number}(,|$)`) }) as HTMLButtonElement
}

async function rollAndAnswer(user: UserEvent, pick = 8) {
  await user.click(await screen.findByRole('button', { name: 'Roll' }))
  await user.click(await screen.findByRole('button', { name: new RegExp(`^Answer ${pick}`) }))
}

test('a new game shows both boxes and a Roll button, with the tiles waiting', async () => {
  renderPage()

  expect(await screen.findByRole('button', { name: 'Roll' })).toBeTruthy()
  expect(screen.getByRole('img', { name: "Robo's box: 9 tiles open" })).toBeTruthy()
  expect(within(screen.getByRole('group', { name: 'Your box' })).getAllByRole('button')).toHaveLength(9)
  expect(tile(5).disabled).toBe(true)
  expect(spokenTexts()).toContain('Tap Roll.')
})

test('rolling shows the dice as dots and four answer cards, and asks how many in all', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Roll' }))

  expect(await screen.findByText('How many dots in all?')).toBeTruthy()
  const dice = within(screen.getByRole('group', { name: 'Your dice' }))
  expect(dice.getByRole('img', { name: '3 dots' })).toBeTruthy()
  expect(dice.getByRole('img', { name: '5 dots' })).toBeTruthy()
  const cards = within(screen.getByRole('group', { name: 'Answer cards' })).getAllByRole('button')
  expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual(['Answer 2', 'Answer 6', 'Answer 7', 'Answer 8'])
  expect(movesSent()).toEqual([{ type: 'roll' }])
  expect(spokenTexts()).toContain('You rolled 3 and 5. Tap how many dots in all.')
})

test('a wrong total wobbles, outlines the right card, resets the stars, and shows and speaks the hint', async () => {
  replies.total = { ...replies.total, correct: false, misconception: 'counted_on_from_start', state: { ...replies.total.state, total_pick: 7 } }
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('button', { name: 'Roll' })
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()

  await rollAndAnswer(user, 7)

  expect(await screen.findByText(TOTAL_HINT)).toBeTruthy()
  expect(vi.mocked(Element.prototype.animate).mock.contexts).toContain(button('Answer 7'))
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(button('Answer 8, the right answer').disabled).toBe(true)
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(screen.getByText('Tap tiles that make 8')).toBeTruthy()
  expect(spokenTexts()).toContain(`${TOTAL_HINT} Tap tiles that make 8, then tap Shut.`)
  expect(document.querySelector('.text-alert-text')).toBeNull()
})

test('tapping tiles selects them, Shut sends them, and a right shut hands the turn to Robo', async () => {
  const user = userEvent.setup()
  renderPage()
  await rollAndAnswer(user)
  await screen.findByText('Tap tiles that make 8')
  expect(button('Shut').disabled).toBe(true)

  await user.click(tile(5))
  await user.click(tile(3))
  await user.click(tile(9))
  await user.click(tile(9))
  expect(tile(5).getAttribute('aria-pressed')).toBe('true')
  expect(tile(9).getAttribute('aria-pressed')).toBe('false')
  await user.click(button('Shut'))

  expect(await screen.findByText('You shut 3 and 5.')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'shut', tiles: [5, 3] })
  expect(tile(3).getAttribute('aria-label')).toBe('Tile 3, shut')
  expect(button(/Robo's turn/)).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('correct')
})

test('a wrong shut wobbles the picked tiles, shows a right way, and shows and speaks the hint', async () => {
  hint = SHUT_HINT
  replies.shut = {
    correct: false,
    misconception: 'tiles_counted_on_from_start',
    state: { ...replies.shut.state, picked_tiles: [4, 5], shut_tiles: [8], my_open: [1, 2, 3, 4, 5, 6, 7, 9] },
  }
  const user = userEvent.setup()
  renderPage()
  await rollAndAnswer(user)
  await screen.findByText('Tap tiles that make 8')

  await user.click(tile(4))
  await user.click(tile(5))
  await user.click(button('Shut'))

  expect(await screen.findByText(SHUT_HINT)).toBeTruthy()
  expect(screen.getByText('Here is a way: 8.')).toBeTruthy()
  const wobbled = vi.mocked(Element.prototype.animate).mock.contexts
  const tiles = within(screen.getByRole('group', { name: 'Your box' })).getAllByRole('button')
  expect(tiles.filter((each) => wobbled.includes(each))).toEqual([tile(4), tile(5)])
  expect(spokenTexts()).toContain(`${SHUT_HINT} Here is a way: 8. Tap Robo's turn.`)
})

test("Robo's turn shows Robo's dice and the tiles it shut, then the student rolls again", async () => {
  const user = userEvent.setup()
  renderPage()
  await rollAndAnswer(user)
  await user.click(await screen.findByRole('button', { name: 'Tile 8' }))
  await user.click(button('Shut'))
  expect(screen.queryByText(/Robo rolled/)).toBeNull()

  await user.click(await screen.findByRole('button', { name: /Robo's turn/ }))

  expect(await screen.findByText('Robo rolled 2 and 6 and shut 8.')).toBeTruthy()
  expect(screen.getByRole('img', { name: "Robo's box: 8 tiles open" })).toBeTruthy()
  expect(button('Roll')).toBeTruthy()
  expect(spokenTexts()).toContain('Robo rolled 2 and 6 and shut 8. Tap Roll.')
})

test('when no tiles make the total the box is done and the turn goes to Robo', async () => {
  replies.total = {
    correct: true,
    misconception: null,
    state: { ...ROLLED, step: 'pass', total_pick: 8, my_total: 8, can_shut: false, my_done: true, my_open: [1, 2, 4] },
  }
  const user = userEvent.setup()
  renderPage()

  await rollAndAnswer(user)

  expect(await screen.findByText('No tiles make 8. Your box is done.')).toBeTruthy()
  expect(button(/Robo's turn/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Shut' })).toBeNull()
})

test('the end of the game counts open tiles, names the winner, and Play again sets up a new box', async () => {
  replies.shut = {
    correct: true,
    misconception: null,
    state: { ...replies.shut.state, step: 'over', my_open: [], picked_tiles: [3, 5], shut_tiles: [3, 5], winner: 'mine' },
  }
  const user = userEvent.setup()
  renderPage()
  await rollAndAnswer(user)
  await user.click(await screen.findByRole('button', { name: 'Tile 3' }))
  await user.click(tile(5))
  await user.click(button('Shut'))

  const result = within(await screen.findByRole('group', { name: 'Game result' }))
  expect(result.getByText('You have 0 tiles open. Robo has 9 tiles open.')).toBeTruthy()
  expect(result.getByText('You win!')).toBeTruthy()

  await user.click(button('Play again'))

  expect(await screen.findByRole('button', { name: 'Roll' })).toBeTruthy()
  expect(deals).toBe(2)
})

test('a move that fails to send says so', async () => {
  movesFail = true
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Roll' }))

  expect(await screen.findByText("Couldn't send that — try again.")).toBeTruthy()
})
