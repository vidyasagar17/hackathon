import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test } from 'vitest'
import LandingPage from './LandingPage'

beforeEach(() => {
  localStorage.clear()
})

function renderLandingPage() {
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

function gameTitlesInOrder(): string[] {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent ?? '')
}

test('a first visit asks for the grade before showing games', () => {
  renderLandingPage()

  expect(screen.getByRole('heading', { name: 'What grade are you in?' })).toBeTruthy()
  expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
})

test('picking 2nd & 3rd grade saves it and lists subtraction and addition first', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: '2nd & 3rd grade' }))

  expect(localStorage.getItem('grade_band')).toBe('2-3')
  expect(gameTitlesInOrder()).toEqual(['Subtraction', 'Addition', 'Multiplication', 'Division'])
})

test('picking 4th & 5th grade lists multiplication and division first', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: '4th & 5th grade' }))

  expect(screen.getByRole('heading', { name: 'Your grade' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'More practice' })).toBeTruthy()
  expect(gameTitlesInOrder()).toEqual(['Multiplication', 'Division', 'Subtraction', 'Addition'])
})

test('kindergarten & 1st grade says its games are coming and keeps every game playable', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Kindergarten & 1st grade' }))

  expect(screen.getByText(/Games for kindergarten and 1st grade are on the way/)).toBeTruthy()
  expect(gameTitlesInOrder()).toHaveLength(4)
})

test('a return visit skips the grade question', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  expect(screen.queryByRole('heading', { name: 'What grade are you in?' })).toBeNull()
  expect(gameTitlesInOrder()[0]).toBe('Multiplication')
})

test('Change grade asks the grade question again', async () => {
  const user = userEvent.setup()
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Change grade' }))

  expect(screen.getByRole('heading', { name: 'What grade are you in?' })).toBeTruthy()
})
