import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import PracticePage from './PracticePage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const PROBLEM = {
  minuend: 742,
  subtrahend: 158,
  answer: 584,
  columns: [
    { place: 'hundreds', minuend_digit: 7, subtrahend_digit: 1, borrows: false },
    { place: 'tens', minuend_digit: 4, subtrahend_digit: 5, borrows: true },
    { place: 'ones', minuend_digit: 2, subtrahend_digit: 8, borrows: true },
  ],
  answer_places: ['hundreds', 'tens', 'ones'],
  difficulty: 2,
}

const PROGRESS = { level: 2, correct_in_a_row: 1, needed: 3, top_level: 3 }

let checkResult = { correct: true, misconception: null as string | null }
let reducedMotion = false
const animate = vi.fn()

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

function fakeApi(url: string) {
  if (url.includes('/check')) return jsonResponse(checkResult)
  if (url.includes('/hint')) return jsonResponse({ misconception: checkResult.misconception, hint: 'Borrow from the tens column.' })
  return jsonResponse({ problem: PROBLEM, progress: PROGRESS })
}

beforeEach(() => {
  localStorage.setItem('tutorial_seen', 'true')
  reducedMotion = false
  animate.mockClear()
  vi.mocked(playSound).mockClear()
  Element.prototype.animate = animate as unknown as Element['animate']
  vi.stubGlobal('fetch', vi.fn(fakeApi))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reducedMotion })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

function renderPracticePage() {
  render(
    <MemoryRouter initialEntries={['/practice/subtraction']}>
      <Routes>
        <Route path="/practice/:gameId" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function answer(digits: string) {
  const user = userEvent.setup()
  const boxes = await screen.findAllByRole('textbox')
  for (let i = 0; i < boxes.length; i++) {
    await user.clear(boxes[i])
    await user.type(boxes[i], digits[i])
  }
  await user.click(screen.getByRole('button', { name: 'Check answer' }))
}

test('the practice page header holds Home, the sound switch and Session summary', async () => {
  renderPracticePage()

  const header = await screen.findByRole('banner')
  expect(within(header).getByRole('button', { name: 'Home' })).toBeTruthy()
  expect(within(header).getByRole('button', { name: 'Sound on' })).toBeTruthy()
  expect(within(header).getByRole('link', { name: 'Session summary' })).toBeTruthy()
})

test('each answer box is named by its place', async () => {
  renderPracticePage()

  expect(await screen.findByRole('textbox', { name: 'Hundreds digit of your answer' })).toBeTruthy()
  expect(screen.getByRole('textbox', { name: 'Tens digit of your answer' })).toBeTruthy()
  expect(screen.getByRole('textbox', { name: 'Ones digit of your answer' })).toBeTruthy()
})

test('a correct answer keeps Correct! on screen with a Next problem button', async () => {
  checkResult = { correct: true, misconception: null }
  renderPracticePage()

  await answer('584')

  expect(await screen.findByText('Correct!')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Next problem' })).toBeTruthy()
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Check answer' }).disabled).toBe(true)
})

test('Check answer sends one request even when tapped twice while checking', async () => {
  let finishCheck = () => {}
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (!url.includes('/check')) return fakeApi(url)
      return new Promise((resolve) => {
        finishCheck = () => resolve({ ok: true, json: () => Promise.resolve({ correct: true, misconception: null }) })
      })
    }),
  )
  const user = userEvent.setup()
  renderPracticePage()

  await answer('584')
  await user.click(screen.getByRole('button', { name: 'Check answer' }))
  finishCheck()

  expect(await screen.findByText('Correct!')).toBeTruthy()
  const checkCalls = vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes('/check'))
  expect(checkCalls).toHaveLength(1)
})

test('a correct answer plays the correct sound', async () => {
  checkResult = { correct: true, misconception: null }
  renderPracticePage()

  await answer('584')

  await screen.findByText('Correct!')
  expect(playSound).toHaveBeenCalledWith('correct')
  expect(playSound).not.toHaveBeenCalledWith('wrong')
})

test('a wrong answer plays the soft wrong sound', async () => {
  checkResult = { correct: false, misconception: 'smaller_from_larger' }
  renderPracticePage()

  await answer('616')

  await screen.findByText('Not quite — try again!')
  expect(playSound).toHaveBeenCalledWith('wrong')
})

test('the progress meter starts from the server and fills a star on a correct answer', async () => {
  checkResult = { correct: true, misconception: null }
  renderPracticePage()

  expect(await screen.findByRole('img', { name: '1 of 3 stars' })).toBeTruthy()
  await answer('584')

  expect(await screen.findByRole('img', { name: '2 of 3 stars' })).toBeTruthy()
  expect(screen.getByText('1 more right in a row to reach Level 3')).toBeTruthy()
})

test('a wrong answer empties the stars, matching the level rule', async () => {
  checkResult = { correct: false, misconception: 'smaller_from_larger' }
  renderPracticePage()

  await answer('616')

  expect(await screen.findByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
})

test('with reduce motion on, the borrow badge jumps into place and step marks still appear', async () => {
  checkResult = { correct: false, misconception: 'smaller_from_larger' }
  reducedMotion = true
  renderPracticePage()

  await answer('616')
  await answer('617')

  const badge = await screen.findByText('10')
  expect(badge.style.transform).toContain('76px')
  expect(screen.getByText('−1')).toBeTruthy()
  expect(animate).not.toHaveBeenCalled()
})

test('without reduce motion, the borrow badge slides between chips', async () => {
  checkResult = { correct: false, misconception: 'smaller_from_larger' }
  renderPracticePage()

  await answer('616')
  await answer('617')

  await screen.findByText('10')
  expect(animate).toHaveBeenCalled()
})

test('after a wrong answer, Check waits until the student changes the answer', async () => {
  checkResult = { correct: false, misconception: 'smaller_from_larger' }
  const user = userEvent.setup()
  renderPracticePage()

  await answer('616')
  await screen.findByText('Not quite — try again!')
  const check = screen.getByRole<HTMLButtonElement>('button', { name: 'Check answer' })
  expect(check.disabled).toBe(true)

  await user.clear(box('Ones'))
  await user.type(box('Ones'), '7')
  expect(box('Ones').value).toBe('7')
  expect(check.disabled).toBe(false)
})

test('a wrong answer after the hint updates the hint without replaying the animation', async () => {
  checkResult = { correct: false, misconception: 'smaller_from_larger' }
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      url.includes('/hint')
        ? jsonResponse({ misconception: checkResult.misconception, hint: `Hint about ${checkResult.misconception}.` })
        : fakeApi(url),
    ),
  )
  renderPracticePage()

  await answer('616')
  await answer('617')
  await screen.findByRole('button', { name: 'Next problem' }, { timeout: 4000 })
  expect(await screen.findByText('Hint about smaller_from_larger.')).toBeTruthy()
  const animationsBefore = animate.mock.calls.length

  checkResult = { correct: false, misconception: 'always_borrow' }
  await answer('474')

  expect(await screen.findByText('Hint about always_borrow.')).toBeTruthy()
  expect(screen.queryByText('Hint about smaller_from_larger.')).toBeNull()
  expect(screen.getByText('Diagnosed pattern: always borrow')).toBeTruthy()
  expect(animate.mock.calls.length).toBe(animationsBefore)
}, 15000)

test('a hint that arrives after Next problem never shows on the new problem', async () => {
  checkResult = { correct: false, misconception: 'smaller_from_larger' }
  const hintReplies: ((hint: string) => void)[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (!url.includes('/hint')) return fakeApi(url)
      return new Promise((resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        hintReplies.push((hint) => resolve({ ok: true, json: () => Promise.resolve({ misconception: 'smaller_from_larger', hint }) }))
      })
    }),
  )
  const user = userEvent.setup()
  renderPracticePage()

  await answer('616')
  await answer('617')
  await user.click(await screen.findByRole('button', { name: 'Next problem' }, { timeout: 4000 }))
  await screen.findByRole('img', { name: '1 of 3 stars' })
  hintReplies[0]('Hint for the old problem.')

  await answer('616')
  await answer('617')
  await screen.findByRole('button', { name: 'Next problem' }, { timeout: 4000 })

  expect(screen.queryByText('Hint for the old problem.')).toBeNull()
}, 15000)

function stubSpeech() {
  const speak = vi.fn()
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() })
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
  return speak
}

test('Read the problem aloud says the problem in words', async () => {
  const speak = stubSpeech()
  const user = userEvent.setup()
  renderPracticePage()

  await user.click(await screen.findByRole('button', { name: 'Read the problem aloud' }))

  expect(speak.mock.calls[0][0].text).toBe('742 minus 158')
})

test('the hint can be read aloud once it appears', async () => {
  const speak = stubSpeech()
  checkResult = { correct: false, misconception: 'smaller_from_larger' }
  const user = userEvent.setup()
  renderPracticePage()

  await answer('616')
  await answer('617')
  await user.click(
    await screen.findByRole('button', { name: 'Read the hint aloud' }, { timeout: 4000 }),
  )

  expect(speak.mock.calls[0][0].text).toBe('Borrow from the tens column.')
})

function box(place: 'Hundreds' | 'Tens' | 'Ones') {
  return screen.getByRole<HTMLInputElement>('textbox', { name: `${place} digit of your answer` })
}

test('the 2nd & 3rd grade keypad fills boxes from the ones place leftward', async () => {
  localStorage.setItem('grade_band', '2-3')
  checkResult = { correct: true, misconception: null }
  const user = userEvent.setup()
  renderPracticePage()

  const keypad = await screen.findByRole('group', { name: 'Number keypad' })
  for (const digit of ['4', '8', '5']) {
    await user.click(within(keypad).getByRole('button', { name: digit }))
  }

  expect([box('Hundreds').value, box('Tens').value, box('Ones').value]).toEqual(['5', '8', '4'])
  await user.click(within(keypad).getByRole('button', { name: 'Check answer' }))
  expect(await screen.findByText('Correct!')).toBeTruthy()
})

test('Delete clears the current box, then steps back to the previous one', async () => {
  localStorage.setItem('grade_band', '2-3')
  const user = userEvent.setup()
  renderPracticePage()

  const keypad = await screen.findByRole('group', { name: 'Number keypad' })
  await user.click(within(keypad).getByRole('button', { name: '4' }))
  await user.click(within(keypad).getByRole('button', { name: '8' }))
  await user.click(within(keypad).getByRole('button', { name: 'Delete' }))

  expect([box('Tens').value, box('Ones').value]).toEqual(['', '4'])
})

test('tapping an answer box chooses where the next keypad digit goes', async () => {
  localStorage.setItem('grade_band', '2-3')
  const user = userEvent.setup()
  renderPracticePage()

  const keypad = await screen.findByRole('group', { name: 'Number keypad' })
  await user.click(box('Hundreds'))
  await user.click(within(keypad).getByRole('button', { name: '7' }))

  expect(box('Hundreds').value).toBe('7')
  expect(box('Ones').value).toBe('')
})

test('with the keypad, answer boxes do not open the device keyboard', async () => {
  localStorage.setItem('grade_band', '2-3')
  renderPracticePage()

  await screen.findByRole('group', { name: 'Number keypad' })

  expect(box('Ones').inputMode).toBe('none')
})

test('typing a digit into a filled box replaces it, wherever the cursor is', async () => {
  localStorage.setItem('grade_band', '4-5')
  const user = userEvent.setup()
  renderPracticePage()

  const ones = await screen.findByRole('textbox', { name: 'Ones digit of your answer' })
  await user.type(ones, '6')
  await user.type(ones, '7')
  expect(box('Ones').value).toBe('7')

  await user.type(ones, '8', { initialSelectionStart: 0, initialSelectionEnd: 0 })
  expect(box('Ones').value).toBe('8')
})

test('outside 2nd & 3rd grade there is no keypad and boxes use the number keyboard', async () => {
  localStorage.setItem('grade_band', '4-5')
  renderPracticePage()

  await screen.findByRole('textbox', { name: 'Ones digit of your answer' })

  expect(screen.queryByRole('group', { name: 'Number keypad' })).toBeNull()
  expect(box('Ones').inputMode).toBe('numeric')
})
