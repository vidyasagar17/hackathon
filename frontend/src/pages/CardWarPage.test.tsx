import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import CardWarPage from './CardWarPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

type Operation = 'add' | 'take_away'

const HINT = 'When you count on from 4, the first number you say is 5: 5, 6, 7.'

let hand = { operation: 'add' as Operation, mine: [3, 4], robo: [5, 1], robo_total: 6, choices: [1, 5, 6, 7], my_total: 7 }
let movesFail = false
let answered: number | null = null

function correctWinner() {
  return hand.my_total > hand.robo_total ? 'mine' : hand.robo_total > hand.my_total ? 'robo' : 'same'
}

function visibleState(answerPick: number | null, winnerPick: string | null = null) {
  return {
    operation: hand.operation,
    level: 1,
    step: answerPick === null ? 'answer' : winnerPick === null ? 'winner' : 'done',
    mine: hand.mine,
    robo: hand.robo,
    robo_total: hand.robo_total,
    choices: hand.choices,
    answer_pick: answerPick,
    my_total: answerPick === null ? null : hand.my_total,
    winner_pick: winnerPick,
    winner: winnerPick === null ? null : correctWinner(),
  }
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/rounds?session_id')) {
    answered = null
    return jsonResponse({
      round_id: 'round-1',
      visible_state: visibleState(null),
      progress: { level: 1, correct_in_a_row: 0, needed: 3, top_level: 3 },
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: 'counted_on_from_start', hint: HINT })
  if (movesFail) return jsonResponse({ detail: 'nope' }, false)
  const { type, pick } = JSON.parse(String(init?.body)).move
  if (type === 'winner') {
    return jsonResponse({ correct: pick === correctWinner(), misconception: null, visible_state: visibleState(answered, pick) })
  }
  answered = pick
  return jsonResponse({
    correct: pick === hand.my_total,
    misconception: pick === hand.my_total ? null : 'counted_on_from_start',
    visible_state: visibleState(pick),
  })
}

function callsTo(part: string) {
  return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes(part))
}

function moveBodies() {
  return callsTo('/moves').map(([, init]) => JSON.parse(String(init?.body)))
}

const speakSpy = vi.fn()

function stubSpeech(hasBeenActive: boolean) {
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
  Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive }, configurable: true })
}

function spokenTexts() {
  return speakSpy.mock.calls.map(([utterance]) => utterance.text)
}

beforeEach(() => {
  hand = { operation: 'add', mine: [3, 4], robo: [5, 1], robo_total: 6, choices: [1, 5, 6, 7], my_total: 7 }
  movesFail = false
  answered = null
  speakSpy.mockClear()
  vi.mocked(playSound).mockClear()
  Element.prototype.animate = vi.fn() as unknown as Element['animate']
  vi.stubGlobal('fetch', vi.fn(fakeApi))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function renderPage(game: 'addition-war' | 'take-away-war' = 'addition-war') {
  render(
    <MemoryRouter initialEntries={[`/curriculum/${game}`]}>
      <Routes>
        <Route path="/curriculum/addition-war" element={<CardWarPage game="addition-war" />} />
        <Route path="/curriculum/take-away-war" element={<CardWarPage game="take-away-war" />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function answerCards() {
  return within(await screen.findByRole('group', { name: 'Answer cards' })).getAllByRole('button')
}

async function winnerButtons() {
  return within(await screen.findByRole('group', { name: 'Who has more?' })).getAllByRole('button')
}

async function tapAnswer(index: number) {
  await userEvent.click((await answerCards())[index])
}

test('an Addition War hand shows both hands, Robo total and four answer cards', async () => {
  renderPage()

  expect((await answerCards()).map((card) => card.getAttribute('aria-label'))).toEqual([
    'Answer 1',
    'Answer 5',
    'Answer 6',
    'Answer 7',
  ])
  expect(screen.getByRole('heading', { name: 'Addition War' })).toBeTruthy()
  expect(screen.getByLabelText('Your cards: 3 plus 4')).toBeTruthy()
  expect(screen.getByLabelText("Robo's cards: 5 plus 1")).toBeTruthy()
  expect(screen.getByText('I have 6!')).toBeTruthy()
  expect(screen.getByText('How many in all?')).toBeTruthy()
  expect(screen.queryByRole('group', { name: 'Who has more?' })).toBeNull()
})

test('a Take-Away War hand shows the bigger card first', async () => {
  hand = { operation: 'take_away', mine: [3, 8], robo: [2, 9], robo_total: 7, choices: [4, 5, 6, 11], my_total: 5 }
  renderPage('take-away-war')

  await answerCards()
  expect(screen.getByRole('heading', { name: 'Take-Away War' })).toBeTruthy()
  expect(screen.getByLabelText('Your cards: 8 take away 3')).toBeTruthy()
  expect(screen.getByLabelText("Robo's cards: 9 take away 2")).toBeTruthy()
  expect(screen.getByText('How many are left?')).toBeTruthy()
})

test('tapping the right card sends it, outlines it, asks who has more, and fetches no hint', async () => {
  stubSpeech(true)
  renderPage()

  await tapAnswer(3)

  expect(moveBodies()).toEqual([{ move: { type: 'answer', pick: 7 } }])
  const cards = await answerCards()
  expect(cards[3].getAttribute('data-result')).toBe('right')
  expect(cards.every((card) => (card as HTMLButtonElement).disabled)).toBe(true)
  expect(playSound).toHaveBeenCalledWith('correct')
  expect((await winnerButtons()).map((button) => button.getAttribute('aria-label'))).toEqual(['You', 'Robo', 'Same'])
  expect(callsTo('/hint')).toHaveLength(0)
  expect(spokenTexts().at(-1)).toBe('You have 7 and Robo has 6. Who has more?')
})

test('tapping a wrong card wobbles it, outlines the right card, and shows and speaks the hint with no red text', async () => {
  stubSpeech(true)
  renderPage()

  await tapAnswer(2)

  const cards = await answerCards()
  expect(cards[2].getAttribute('data-result')).toBe('picked-wrong')
  expect(cards[3].getAttribute('data-result')).toBe('right')
  expect(Element.prototype.animate).toHaveBeenCalled()
  expect(await screen.findByText(HINT)).toBeTruthy()
  expect(spokenTexts().at(-1)).toBe(`${HINT} You have 7 and Robo has 6. Who has more?`)
  expect(screen.queryByText(/not quite/i)).toBeNull()
  expect(document.querySelector('.text-alert-text')).toBeNull()
})

test('a wrong card does not wobble when the device asks for less motion', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  renderPage()

  await tapAnswer(2)

  expect((await answerCards())[2].getAttribute('data-result')).toBe('picked-wrong')
  expect(Element.prototype.animate).not.toHaveBeenCalled()
})

test('the instruction is spoken automatically once the student has tapped the site', async () => {
  stubSpeech(true)
  renderPage()

  await answerCards()
  expect(spokenTexts()).toEqual(['You have 3 and 4. Tap how many in all.'])
})

test('the instruction waits for a tap when the browser does not allow speech yet, and Hear it again reads it', async () => {
  stubSpeech(false)
  renderPage()

  await answerCards()
  expect(spokenTexts()).toEqual([])

  await userEvent.click(screen.getByRole('button', { name: 'Hear it again' }))
  expect(spokenTexts()).toEqual(['You have 3 and 4. Tap how many in all.'])
})

test('picking the right winner outlines it and shows and speaks the result', async () => {
  stubSpeech(true)
  renderPage()
  await tapAnswer(3)

  await userEvent.click((await winnerButtons())[0])

  expect(moveBodies().at(-1)).toEqual({ move: { type: 'winner', pick: 'mine' } })
  const buttons = await winnerButtons()
  expect(buttons[0].getAttribute('data-result')).toBe('right')
  expect(buttons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true)
  expect(await screen.findByText('You win!')).toBeTruthy()
  expect(spokenTexts().at(-1)).toBe('You have 7. Robo has 6. You win!')
  expect(screen.getByRole('button', { name: 'Next hand' })).toBeTruthy()
})

test('picking the wrong winner wobbles it and outlines the right one', async () => {
  renderPage()
  await tapAnswer(3)
  vi.mocked(Element.prototype.animate).mockClear()

  await userEvent.click((await winnerButtons())[1])

  const buttons = await winnerButtons()
  expect(buttons[1].getAttribute('data-result')).toBe('picked-wrong')
  expect(buttons[0].getAttribute('data-result')).toBe('right')
  expect(Element.prototype.animate).toHaveBeenCalled()
  expect(await screen.findByText('You win!')).toBeTruthy()
})

test('equal hands are a tie', async () => {
  hand = { ...hand, robo: [5, 2], robo_total: 7 }
  renderPage()
  await tapAnswer(3)

  await userEvent.click((await winnerButtons())[2])

  expect(await screen.findByText("Same! It's a tie.")).toBeTruthy()
})

test('Next hand deals a fresh hand and clears the hint and result', async () => {
  renderPage()
  await tapAnswer(2)
  await screen.findByText(HINT)
  await userEvent.click((await winnerButtons())[0])

  await userEvent.click(await screen.findByRole('button', { name: 'Next hand' }))

  expect(callsTo('/rounds?session_id')).toHaveLength(2)
  const cards = await answerCards()
  expect(cards.every((card) => !(card as HTMLButtonElement).disabled)).toBe(true)
  expect(cards.every((card) => card.getAttribute('data-result') === null)).toBe(true)
  expect(screen.queryByText(HINT)).toBeNull()
  expect(screen.queryByText('You win!')).toBeNull()
  expect(screen.queryByRole('group', { name: 'Who has more?' })).toBeNull()
})

test('a failed answer keeps the cards tappable', async () => {
  movesFail = true
  renderPage()

  await tapAnswer(3)

  expect(await screen.findByText("Couldn't send that — try again.")).toBeTruthy()
  expect(((await answerCards())[3] as HTMLButtonElement).disabled).toBe(false)
})

test('a hand that fails to deal offers a retry', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
  renderPage()

  expect(await screen.findByText("Couldn't deal the cards — try again.")).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
})
