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

test('a correct answer keeps Correct! on screen with a Next problem button', async () => {
  checkResult = { correct: true, misconception: null }
  renderPracticePage()

  await answer('584')

  expect(await screen.findByText('Correct!')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Next problem' })).toBeTruthy()
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Check answer' }).disabled).toBe(true)
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
  await answer('616')

  const badge = await screen.findByText('10')
  expect(badge.style.transform).toContain('76px')
  expect(screen.getByText('−1')).toBeTruthy()
  expect(animate).not.toHaveBeenCalled()
})

test('without reduce motion, the borrow badge slides between chips', async () => {
  checkResult = { correct: false, misconception: 'smaller_from_larger' }
  renderPracticePage()

  await answer('616')
  await answer('616')

  await screen.findByText('10')
  expect(animate).toHaveBeenCalled()
})

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
  await answer('616')
  await user.click(
    await screen.findByRole('button', { name: 'Read the hint aloud' }, { timeout: 4000 }),
  )

  expect(speak.mock.calls[0][0].text).toBe('Borrow from the tens column.')
})
