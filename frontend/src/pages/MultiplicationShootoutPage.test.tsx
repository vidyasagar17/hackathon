import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import MultiplicationShootoutPage from './MultiplicationShootoutPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

type Fact = { operation: 'multiply' | 'divide'; left: number; right: number }

const HINT = '48 is 6 × 8. 6 × 7 is 6 less: 48 − 6 = 42.'

let fact: Fact = { operation: 'multiply', left: 6, right: 7 }
let roboFact: Fact = { operation: 'multiply', left: 3, right: 4 }
let roboAnswer = 12
let movesFail = false
let releaseDeal: (() => void) | null = null
let holdDeals = false

function correctAnswer(f: Fact) {
  return f.operation === 'multiply' ? f.left * f.right : f.left / f.right
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/multiplication-shootout/rounds')) {
    const payload = {
      round_id: 'round-1',
      visible_state: {
        level: 1,
        fact,
        answer: null,
        correct_answer: null,
        robo_fact: null,
        robo_answer: null,
        robo_correct_answer: null,
      },
      progress: { level: 1, correct_in_a_row: 0, needed: 3, top_level: 3 },
    }
    if (!holdDeals) return jsonResponse(payload)
    return new Promise((resolve) => {
      releaseDeal = () => resolve(jsonResponse(payload))
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: 'neighboring_fact', hint: HINT })
  if (movesFail) return jsonResponse({ detail: 'nope' }, false)
  const { move } = JSON.parse(String(init?.body))
  const correct = move.answer === correctAnswer(fact)
  return jsonResponse({
    correct,
    misconception: correct ? null : 'neighboring_fact',
    visible_state: {
      level: 1,
      fact,
      answer: move.answer,
      correct_answer: correctAnswer(fact),
      robo_fact: roboFact,
      robo_answer: roboAnswer,
      robo_correct_answer: correctAnswer(roboFact),
    },
  })
}

function callsTo(ending: string) {
  return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith(ending))
}

function moveBodies() {
  return callsTo('/moves').map(([, init]) => JSON.parse(String(init?.body)))
}

beforeEach(() => {
  fact = { operation: 'multiply', left: 6, right: 7 }
  roboFact = { operation: 'multiply', left: 3, right: 4 }
  roboAnswer = 12
  movesFail = false
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
    <MemoryRouter initialEntries={['/curriculum/multiplication-shootout']}>
      <Routes>
        <Route path="/curriculum/multiplication-shootout" element={<MultiplicationShootoutPage />} />
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

function box(place: 'Tens' | 'Ones') {
  return screen.getByRole('textbox', { name: `${place} digit of your answer` }) as HTMLInputElement
}

function boxes() {
  return [box('Tens').value, box('Ones').value]
}

async function pressKeys(...keys: string[]) {
  const keypad = await screen.findByRole('group', { name: 'Number keypad' })
  for (const key of keys) await userEvent.click(within(keypad).getByRole('button', { name: key }))
}

test('a new turn shows Robo calling the fact on cards', async () => {
  renderPage()

  expect(await screen.findByRole('group', { name: 'Robo calls 6 times 7' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Multiplication Shootout' })).toBeTruthy()
  expect(boxes()).toEqual(['', ''])
})

test('a division fact is called with a divided-by sign', async () => {
  fact = { operation: 'divide', left: 56, right: 8 }
  renderPage()

  const called = await screen.findByRole('group', { name: 'Robo calls 56 divided by 8' })
  expect(within(called).getByText('÷')).toBeTruthy()
})

test('the keypad fills the answer left to right like a calculator, two digits at most', async () => {
  renderPage()
  const check = (await screen.findByRole('button', { name: 'Check answer' })) as HTMLButtonElement
  expect(check.disabled).toBe(true)

  await pressKeys('4')
  expect(boxes()).toEqual(['', '4'])
  expect(check.disabled).toBe(false)

  await pressKeys('2')
  expect(boxes()).toEqual(['4', '2'])

  await pressKeys('9')
  expect(boxes()).toEqual(['4', '2'])

  await pressKeys('Delete')
  expect(boxes()).toEqual(['', '4'])
  expect(playSound).toHaveBeenCalledWith('tap')
})

test('a correct answer is checked and shows Correct', async () => {
  renderPage()

  await pressKeys('4', '2', 'Check answer')

  expect(moveBodies()).toEqual([{ move: { answer: 42 } }])
  expect(await screen.findByText('Correct!')).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('correct')
  expect(screen.queryByRole('group', { name: 'Number keypad' })).toBeNull()
})

test('a one-digit answer can be checked', async () => {
  fact = { operation: 'divide', left: 56, right: 8 }
  renderPage()

  await pressKeys('7', 'Check answer')

  expect(moveBodies()).toEqual([{ move: { answer: 7 } }])
  expect(await screen.findByText('Correct!')).toBeTruthy()
})

test('a wrong answer shows the right one, and the hint with its diagnosis only when the student asks', async () => {
  stubSpeech()
  renderPage()

  await pressKeys('4', '8', 'Check answer')

  const table = screen.getByRole('region', { name: 'Game table' })
  expect(await within(table).findByText('Not quite — 6 × 7 is 42.')).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(callsTo('/hint')).toHaveLength(0)

  await userEvent.click(within(table).getByRole('button', { name: 'Show me why' }))

  expect(await within(table).findByText(HINT)).toBeTruthy()
  expect(within(table).getByText('Diagnosed pattern: neighboring fact')).toBeTruthy()
  expect(within(table).getByRole('button', { name: 'Read the hint aloud' })).toBeTruthy()
})

test('a keyboard user can type the answer and press Enter', async () => {
  renderPage()
  await screen.findByRole('group', { name: 'Robo calls 6 times 7' })

  await userEvent.type(box('Ones'), '4')
  await userEvent.type(box('Ones'), '2{Enter}')

  expect(moveBodies()).toEqual([{ move: { answer: 42 } }])
})

test('a failed answer keeps the typed digits', async () => {
  movesFail = true
  renderPage()

  await pressKeys('4', '2', 'Check answer')

  expect(await screen.findByText("Couldn't send your answer — try again.")).toBeTruthy()
  expect(boxes()).toEqual(['4', '2'])
})

test('a turn that fails to deal offers a retry', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
  renderPage()

  expect(await screen.findByText("Couldn't deal a turn — try again.")).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
})

function button(name: string) {
  return screen.queryByRole('button', { name }) as HTMLButtonElement | null
}

test("Robo's turn waits for the student's check, then shows Robo's fact and correct answer in Robo's row", async () => {
  renderPage()
  await screen.findByRole('group', { name: 'Robo calls 6 times 7' })
  expect(button("Robo's turn")).toBeNull()

  await pressKeys('4', '2', 'Check answer')
  await screen.findByText('Correct!')
  await userEvent.click(button("Robo's turn") as HTMLButtonElement)

  expect(screen.getByRole('group', { name: "Robo's fact: 3 times 4" })).toBeTruthy()
  expect(screen.getByText("I think it's 12 — correct!")).toBeTruthy()
  expect(screen.queryByRole('group', { name: 'Robo calls 6 times 7' })).toBeNull()
  expect(button("Robo's turn")).toBeNull()
})

test('a wrong Robo answer always shows the correct one', async () => {
  roboFact = { operation: 'multiply', left: 8, right: 7 }
  roboAnswer = 48
  renderPage()

  await pressKeys('4', '2', 'Check answer')
  await userEvent.click(await screen.findByRole('button', { name: "Robo's turn" }))

  expect(screen.getByText('I said 48 — 8 × 7 is 56.')).toBeTruthy()
})

test("the hint stays reachable before Robo's turn and on screen after it", async () => {
  stubSpeech()
  renderPage()

  await pressKeys('4', '8', 'Check answer')
  const table = screen.getByRole('region', { name: 'Game table' })
  await within(table).findByText('Not quite — 6 × 7 is 42.')
  expect(within(table).getByRole('button', { name: "Robo's turn" })).toBeTruthy()

  await userEvent.click(within(table).getByRole('button', { name: 'Show me why' }))
  await within(table).findByText(HINT)
  await userEvent.click(within(table).getByRole('button', { name: "Robo's turn" }))

  expect(within(table).getByText(HINT)).toBeTruthy()
  expect(within(table).getByText('Not quite — 6 × 7 is 42.')).toBeTruthy()
})

test('Next turn deals a new fact with empty answer boxes and the keypad back', async () => {
  renderPage()
  await pressKeys('4', '2', 'Check answer')
  await userEvent.click(await screen.findByRole('button', { name: "Robo's turn" }))
  fact = { operation: 'multiply', left: 3, right: 5 }

  await userEvent.click(button('Next turn') as HTMLButtonElement)

  expect(await screen.findByRole('group', { name: 'Robo calls 3 times 5' })).toBeTruthy()
  expect(boxes()).toEqual(['', ''])
  expect(screen.queryByText('Correct!')).toBeNull()
  expect(screen.getByRole('group', { name: 'Number keypad' })).toBeTruthy()
  expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/rounds?'))).toHaveLength(2)
})

test('a double tap on Next turn deals only one new fact', async () => {
  renderPage()
  await pressKeys('4', '2', 'Check answer')
  await userEvent.click(await screen.findByRole('button', { name: "Robo's turn" }))

  holdDeals = true
  await userEvent.dblClick(screen.getByRole('button', { name: 'Next turn' }))
  releaseDeal?.()

  expect(await screen.findByText('Turn 2 of 10 · You 1 · Robo 1')).toBeTruthy()
  expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/rounds?'))).toHaveLength(2)
})

/** Answer the student's fact (6 × 7) right or wrong, then show Robo's turn. */
async function playTurn(studentRight: boolean) {
  await pressKeys(...(studentRight ? ['4', '2'] : ['4', '8']), 'Check answer')
  await userEvent.click(await screen.findByRole('button', { name: "Robo's turn" }))
}

/** Play all ten turns and open the result. */
async function playDuel(studentRight: boolean, roboRight: boolean) {
  roboAnswer = roboRight ? 12 : 11
  renderPage()
  for (let turn = 1; turn <= 10; turn++) {
    await playTurn(studentRight)
    if (turn < 10) await userEvent.click(await screen.findByRole('button', { name: 'Next turn' }))
  }
  await userEvent.click(screen.getByRole('button', { name: 'See who won' }))
  return screen.findByRole('group', { name: 'Duel result' })
}

function resultAnimations(result: HTMLElement) {
  return vi.mocked(Element.prototype.animate).mock.contexts.filter((context) => context === result)
}

test('the score line counts the student at Check and Robo once its turn is shown', async () => {
  renderPage()
  expect(await screen.findByText('Turn 1 of 10 · You 0 · Robo 0')).toBeTruthy()

  await pressKeys('4', '2', 'Check answer')
  expect(await screen.findByText('Turn 1 of 10 · You 1 · Robo 0')).toBeTruthy()

  await userEvent.click(screen.getByRole('button', { name: "Robo's turn" }))
  expect(screen.getByText('Turn 1 of 10 · You 1 · Robo 1')).toBeTruthy()

  await userEvent.click(screen.getByRole('button', { name: 'Next turn' }))
  expect(await screen.findByText('Turn 2 of 10 · You 1 · Robo 1')).toBeTruthy()
})

test('turn 10 offers See who won instead of Next turn', async () => {
  renderPage()
  for (let turn = 1; turn <= 9; turn++) {
    await playTurn(true)
    await userEvent.click(await screen.findByRole('button', { name: 'Next turn' }))
  }

  await playTurn(true)

  expect(screen.getByText('Turn 10 of 10 · You 10 · Robo 10')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Next turn' })).toBeNull()
  expect(screen.getByRole('button', { name: 'See who won' })).toBeTruthy()
})

test.each([
  [true, false, 'You 10 · Robo 0', 'You win this duel!'],
  [false, true, 'You 0 · Robo 10', 'Robo wins this duel.'],
  [true, true, 'You 10 · Robo 10', "It's a draw!"],
])('the result shows both totals and the outcome (student right %s, Robo right %s)', async (studentRight, roboRight, totals, outcome) => {
  const result = await playDuel(studentRight, roboRight)

  expect(within(result).getByText(totals)).toBeTruthy()
  expect(within(result).getByText(outcome)).toBeTruthy()
})

test('Play again starts a new duel at turn 1', async () => {
  const result = await playDuel(true, false)

  await userEvent.click(within(result).getByRole('button', { name: 'Play again' }))

  expect(await screen.findByText('Turn 1 of 10 · You 0 · Robo 0')).toBeTruthy()
  expect(boxes()).toEqual(['', ''])
  expect(screen.queryByRole('group', { name: 'Duel result' })).toBeNull()
  expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/rounds?'))).toHaveLength(11)
})

test('a win celebrates the result once, in under 1.5 s', async () => {
  const result = await playDuel(true, false)

  const calls = vi.mocked(Element.prototype.animate).mock.calls.filter((_, i) =>
    vi.mocked(Element.prototype.animate).mock.contexts[i] === result,
  )
  expect(calls).toHaveLength(1)
  const options = calls[0][1] as KeyframeAnimationOptions
  expect(Number(options.duration)).toBeLessThanOrEqual(1500)
  expect(options.iterations ?? 1).toBe(1)
})

test('a loss or a draw does not celebrate', async () => {
  expect(resultAnimations(await playDuel(false, true))).toHaveLength(0)
})

test('reduced motion turns the win celebration off', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))

  expect(resultAnimations(await playDuel(true, false))).toHaveLength(0)
})

test('no win celebration while another animation is still running on the page', async () => {
  const withAnimations = document as unknown as { getAnimations?: () => Animation[] }
  withAnimations.getAnimations = () => [{ playState: 'running' } as Animation]
  try {
    expect(resultAnimations(await playDuel(true, false))).toHaveLength(0)
  } finally {
    delete withAnimations.getAnimations
  }
})
