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

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

beforeEach(() => {
  localStorage.setItem('tutorial_seen', 'true')
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      jsonResponse(url.includes('/check') ? { correct: true, misconception: null } : PROBLEM),
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

test('a correct answer keeps Correct! on screen with a Next problem button', async () => {
  const user = userEvent.setup()
  renderPracticePage()

  const boxes = await screen.findAllByRole('textbox')
  for (let i = 0; i < boxes.length; i++) {
    await user.type(boxes[i], '584'[i])
  }
  await user.click(screen.getByRole('button', { name: 'Check answer' }))

  expect(await screen.findByText('Correct!')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Next problem' })).toBeTruthy()
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Check answer' }).disabled).toBe(true)
})
