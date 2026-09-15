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
let movesFail = false

function correctAnswer(f: Fact) {
  return f.operation === 'multiply' ? f.left * f.right : f.left / f.right
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/multiplication-shootout/rounds')) {
    return jsonResponse({
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
    })
  }
  if (url.endsWith('/hint')) return jsonResponse({ misconception: 'operand_related', hint: HINT })
  if (movesFail) return jsonResponse({ detail: 'nope' }, false)
  const { move } = JSON.parse(String(init?.body))
  const correct = move.answer === correctAnswer(fact)
  return jsonResponse({
    correct,
    misconception: correct ? null : 'operand_related',
    visible_state: {
      level: 1,
      fact,
      answer: move.answer,
      correct_answer: correctAnswer(fact),
      robo_fact: { operation: 'multiply', left: 3, right: 4 },
      robo_answer: 12,
      robo_correct_answer: 12,
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
  movesFail = false
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
  expect(within(table).getByText('Diagnosed pattern: operand related')).toBeTruthy()
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
