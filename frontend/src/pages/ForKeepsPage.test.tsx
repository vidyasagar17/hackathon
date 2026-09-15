import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import ForKeepsPage from './ForKeepsPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

function hand(overrides: Record<string, unknown> = {}) {
  return {
    my_cards: [7, 3, 5, 8],
    robo_cards: [2, 4, 6, 9],
    my_numbers: null,
    my_answer: null,
    difference: null,
    my_kept: null,
    robo_numbers: null,
    robo_difference: null,
    robo_kept: null,
    ...overrides,
  }
}

const HINT = "In the ones column, 3 is smaller than 8, so you can't subtract yet: borrow from the tens column."

let myCards = [7, 3, 5, 8]
let movesFail = false
let builtNumbers: [number, number] = [0, 0]
let startHand = 1
let keepChoices = [true, false]
let keepReason: string | null = null
let totalsBefore = { mine: 0, robo: 0 }

function earlierHands() {
  return Array.from({ length: startHand - 1 }, () => hand({ my_kept: false, robo_kept: false }))
}

function visibleState(step: string, current: ReturnType<typeof hand>) {
  return {
    level: 1,
    hand_number: startHand,
    step,
    hands: [...earlierHands(), current],
    keep_choices: step === 'keep' ? keepChoices : null,
    keep_reason: step === 'keep' ? keepReason : null,
    my_total: totalsBefore.mine,
    robo_total: totalsBefore.robo,
  }
}

/** Robo builds 83 − 75 and keeps its 8 on every hand. */
function afterKeep(keep: boolean) {
  const difference = builtNumbers[0] - builtNumbers[1]
  const finished = hand({
    my_cards: myCards,
    my_numbers: builtNumbers,
    my_answer: difference,
    difference,
    my_kept: keep,
    robo_numbers: [83, 75],
    robo_difference: 8,
    robo_kept: true,
  })
  const over = startHand === 4
  return {
    level: 1,
    hand_number: over ? 4 : startHand + 1,
    step: over ? 'over' : 'arrange',
    hands: [...earlierHands(), finished, ...(over ? [] : [hand({ my_cards: [1, 2, 4, 6] })])],
    keep_choices: null,
    keep_reason: null,
    my_total: totalsBefore.mine + (keep ? difference : 0),
    robo_total: totalsBefore.robo + 8,
  }
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/for-keeps/rounds')) {
    return jsonResponse({
      round_id: 'round-1',
      visible_state: visibleState('arrange', hand({ my_cards: myCards })),
      progress: { level: 1, correct_in_a_row: 0, needed: 3, top_level: 3 },
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: 'smaller_from_larger', hint: HINT })
  if (movesFail) return jsonResponse({ detail: 'nope' }, false)
  const { move } = JSON.parse(String(init?.body))
  if (move.type === 'keep') {
    return jsonResponse({ correct: true, misconception: null, visible_state: afterKeep(move.keep) })
  }
  if (move.type === 'difference') {
    const difference = builtNumbers[0] - builtNumbers[1]
    const correct = move.answer === difference
    return jsonResponse({
      correct,
      misconception: correct ? null : 'smaller_from_larger',
      visible_state: visibleState(
        'keep',
        hand({ my_cards: myCards, my_numbers: builtNumbers, my_answer: move.answer, difference }),
      ),
    })
  }
  const cards: number[] = move.cards
  const first = cards[0] * 10 + cards[1]
  const second = cards[2] * 10 + cards[3]
  builtNumbers = [Math.max(first, second), Math.min(first, second)]
  return jsonResponse({
    correct: true,
    misconception: null,
    visible_state: visibleState('difference', hand({ my_cards: myCards, my_numbers: builtNumbers })),
  })
}

function callsTo(ending: string) {
  return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith(ending))
}

function moveBodies() {
  return callsTo('/moves').map(([, init]) => JSON.parse(String(init?.body)))
}

beforeEach(() => {
  myCards = [7, 3, 5, 8]
  movesFail = false
  builtNumbers = [0, 0]
  startHand = 1
  keepChoices = [true, false]
  keepReason = null
  totalsBefore = { mine: 0, robo: 0 }
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
    <MemoryRouter initialEntries={['/curriculum/for-keeps']}>
      <Routes>
        <Route path="/curriculum/for-keeps" element={<ForKeepsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function stubSpeech() {
  vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn() })
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
}

async function handCards() {
  return within(await screen.findByRole('group', { name: 'Your cards' })).queryAllByRole('button')
}

async function tapCard(digit: number) {
  const [card] = within(await screen.findByRole('group', { name: 'Your cards' })).getAllByRole('button', {
    name: `Card ${digit}`,
  })
  await userEvent.click(card)
}

test('a new hand shows the hand number, four cards to place and Robo cards face up', async () => {
  renderPage()

  expect(await handCards()).toHaveLength(4)
  expect(screen.getByText('Hand 1 of 4')).toBeTruthy()
  expect(screen.getByRole('group', { name: "Robo's cards: 2, 4, 6, 9" })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Top number tens: empty' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Bottom number ones: empty' })).toBeTruthy()
})

test('tapping cards fills the slots in order: top tens, top ones, bottom tens, bottom ones', async () => {
  renderPage()

  for (const digit of [5, 8, 7, 3]) await tapCard(digit)

  expect(screen.getByRole('button', { name: 'Top number tens: 5' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Top number ones: 8' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Bottom number tens: 7' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Bottom number ones: 3' })).toBeTruthy()
  expect(await handCards()).toHaveLength(0)
  expect(playSound).toHaveBeenCalledWith('tap')
})

test('tapping a placed card sends it back, and the next card fills that slot', async () => {
  renderPage()
  await tapCard(7)
  await tapCard(3)

  await userEvent.click(screen.getByRole('button', { name: 'Top number tens: 7' }))

  expect(screen.getByRole('button', { name: 'Top number tens: empty' })).toBeTruthy()
  expect(await handCards()).toHaveLength(3)
  await tapCard(5)
  expect(screen.getByRole('button', { name: 'Top number tens: 5' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Top number ones: 3' })).toBeTruthy()
})

test('two cards with the same digit can both be placed', async () => {
  myCards = [7, 7, 5, 8]
  renderPage()

  await tapCard(7)
  await tapCard(7)

  expect(screen.getByRole('button', { name: 'Top number tens: 7' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Top number ones: 7' })).toBeTruthy()
  expect(await handCards()).toHaveLength(2)
})

test('the numbers are sent only once all four cards are placed, and come back larger first', async () => {
  renderPage()
  const makeNumbers = await screen.findByRole('button', { name: 'Make these numbers' })
  expect((makeNumbers as HTMLButtonElement).disabled).toBe(true)

  for (const digit of [5, 8, 7, 3]) await tapCard(digit)
  await userEvent.click(makeNumbers)

  expect(moveBodies()).toEqual([{ move: { type: 'arrange', cards: [5, 8, 7, 3] } }])
  expect(await screen.findByLabelText('73 minus 58')).toBeTruthy()
  expect(screen.queryByRole('group', { name: 'Your cards' })).toBeNull()
})

test('a failed arrangement keeps the cards where the student put them', async () => {
  movesFail = true
  renderPage()
  for (const digit of [5, 8, 7, 3]) await tapCard(digit)

  await userEvent.click(screen.getByRole('button', { name: 'Make these numbers' }))

  expect(await screen.findByText("Couldn't send your numbers — try again.")).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Top number tens: 5' })).toBeTruthy()
})

/** Build 73 − 58 from the cards 7 3 5 8. */
async function arrangeCards() {
  renderPage()
  for (const digit of [5, 8, 7, 3]) await tapCard(digit)
  await userEvent.click(screen.getByRole('button', { name: 'Make these numbers' }))
  await screen.findByLabelText('73 minus 58')
}

function box(place: 'Tens' | 'Ones') {
  return screen.getByRole('textbox', { name: `${place} digit of your answer` }) as HTMLInputElement
}

async function pressKeys(...keys: string[]) {
  const keypad = screen.getByRole('group', { name: 'Number keypad' })
  for (const key of keys) await userEvent.click(within(keypad).getByRole('button', { name: key }))
}

test('the keypad fills the ones box first, then the tens box', async () => {
  await arrangeCards()
  const check = screen.getByRole('button', { name: 'Check answer' }) as HTMLButtonElement
  expect(check.disabled).toBe(true)

  await pressKeys('5')
  expect([box('Tens').value, box('Ones').value]).toEqual(['', '5'])
  expect(check.disabled).toBe(false)

  await pressKeys('1')
  expect([box('Tens').value, box('Ones').value]).toEqual(['1', '5'])

  await pressKeys('Delete')
  expect([box('Tens').value, box('Ones').value]).toEqual(['', '5'])
})

test('a correct difference is checked and shows Correct', async () => {
  await arrangeCards()

  await pressKeys('5', '1', 'Check answer')

  expect(moveBodies().at(-1)).toEqual({ move: { type: 'difference', answer: 15 } })
  expect(await screen.findByText('Correct!')).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('correct')
  expect(screen.queryByRole('group', { name: 'Number keypad' })).toBeNull()
})

test('a wrong difference shows the right one, and the hint only when the student asks', async () => {
  stubSpeech()
  await arrangeCards()

  await pressKeys('5', '2', 'Check answer')

  expect(await screen.findByText('Not quite — the difference is 15.')).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(callsTo('/hint')).toHaveLength(0)

  await userEvent.click(screen.getByRole('button', { name: 'Show me why' }))

  expect(await screen.findByText(HINT)).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: smaller from larger')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Read the hint aloud' })).toBeTruthy()
})

test('a keyboard user can type the difference and press Enter', async () => {
  await arrangeCards()

  await userEvent.type(box('Tens'), '1')
  await userEvent.type(box('Ones'), '5{Enter}')

  expect(moveBodies().at(-1)).toEqual({ move: { type: 'difference', answer: 15 } })
})

test('a failed difference keeps the typed digits', async () => {
  await arrangeCards()
  movesFail = true

  await pressKeys('5', '1', 'Check answer')

  expect(await screen.findByText("Couldn't send your answer — try again.")).toBeTruthy()
  expect([box('Tens').value, box('Ones').value]).toEqual(['1', '5'])
})

async function answerCorrectly() {
  await arrangeCards()
  await pressKeys('5', '1', 'Check answer')
  await screen.findByText('Correct!')
}

function button(name: string) {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

test('after the difference the student can keep or trash it', async () => {
  await answerCorrectly()

  expect(button('Keep it').disabled).toBe(false)
  expect(button('Trash it').disabled).toBe(false)
})

test('a forced choice greys out the other button and says why', async () => {
  keepChoices = [true]
  keepReason = 'You must keep this one.'
  await answerCorrectly()

  expect(button('Keep it').disabled).toBe(false)
  expect(button('Trash it').disabled).toBe(true)
  expect(screen.getByText('You must keep this one.')).toBeTruthy()
})

test('keeping reveals Robo hand and the totals, and waits for Next hand', async () => {
  await answerCorrectly()

  await userEvent.click(button('Keep it'))

  expect(moveBodies().at(-1)).toEqual({ move: { type: 'keep', keep: true } })
  expect(await screen.findByText('You kept 15')).toBeTruthy()
  expect(screen.getByLabelText('83 minus 75')).toBeTruthy()
  expect(screen.getByText('Robo kept 8')).toBeTruthy()
  expect(screen.getByText('Kept totals: You 15, Robo 8')).toBeTruthy()
  expect(screen.getByText('Hand 1 of 4')).toBeTruthy()
  expect(screen.queryByRole('group', { name: 'Your cards' })).toBeNull()

  await userEvent.click(button('Next hand'))

  expect(screen.getByText('Hand 2 of 4')).toBeTruthy()
  expect(await handCards()).toHaveLength(4)
  expect(screen.queryByText('Correct!')).toBeNull()
})

test('trashing shows the trashed score and leaves the total unchanged', async () => {
  await answerCorrectly()

  await userEvent.click(button('Trash it'))

  expect(await screen.findByText('You trashed 15')).toBeTruthy()
  expect(screen.getByText('Kept totals: You 0, Robo 8')).toBeTruthy()
})

test.each([
  [{ mine: 20, robo: 10 }, 'Robo wins with the lower total.'],
  [{ mine: 0, robo: 30 }, 'You win with the lower total!'],
  [{ mine: 3, robo: 10 }, "It's a tie!"],
])('the last hand ends the game with the winner (totals before %o)', async (before, outcome) => {
  startHand = 4
  keepChoices = [true]
  totalsBefore = before
  await answerCorrectly()

  await userEvent.click(button('Keep it'))

  expect(await screen.findByText(outcome)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Next hand' })).toBeNull()

  await userEvent.click(button('Play again'))

  const roundRequests = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/curriculum/for-keeps/rounds'))
  expect(roundRequests).toHaveLength(2)
  expect(await handCards()).toHaveLength(4)
})

test('the verdict, the hint with its diagnosis, the choices and Next hand all sit on the table', async () => {
  stubSpeech()
  await arrangeCards()
  await pressKeys('5', '2', 'Check answer')

  const table = screen.getByRole('region', { name: 'Game table' })
  expect(await within(table).findByText('Not quite — the difference is 15.')).toBeTruthy()
  expect(within(table).getByRole('button', { name: 'Keep it' })).toBeTruthy()

  await userEvent.click(within(table).getByRole('button', { name: 'Show me why' }))
  expect(await within(table).findByText(HINT)).toBeTruthy()
  expect(within(table).getByText('Diagnosed pattern: smaller from larger')).toBeTruthy()
  expect(within(table).getByRole('button', { name: 'Read the hint aloud' })).toBeTruthy()

  await userEvent.click(within(table).getByRole('button', { name: 'Keep it' }))
  expect(await within(table).findByRole('button', { name: 'Next hand' })).toBeTruthy()
})

test('a keep choice that fails to send says so', async () => {
  await answerCorrectly()
  movesFail = true

  await userEvent.click(button('Keep it'))

  expect(await screen.findByText("Couldn't send your choice — try again.")).toBeTruthy()
  expect(button('Keep it').disabled).toBe(false)
})

test('a hand that fails to deal offers a retry', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
  renderPage()

  expect(await screen.findByText("Couldn't deal a hand — try again.")).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
})
