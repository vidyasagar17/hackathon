import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import PracticePage from './PracticePage'

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

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

beforeEach(() => {
  localStorage.setItem('tutorial_seen', 'true')
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      jsonResponse(url.includes('/check') ? checkResult : { problem: PROBLEM, progress: PROGRESS }),
    ),
  )
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

test('a correct answer keeps Correct! on screen with a Next problem button', async () => {
  checkResult = { correct: true, misconception: null }
  renderPracticePage()

  await answer('584')

  expect(await screen.findByText('Correct!')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Next problem' })).toBeTruthy()
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Check answer' }).disabled).toBe(true)
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
