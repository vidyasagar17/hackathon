import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import LandingPage from './LandingPage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
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

function shelvesInOrder(): string[] {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent ?? '')
}

test('a first visit asks for the grade before showing games', () => {
  renderLandingPage()

  expect(screen.getByRole('heading', { name: 'What grade are you in?' })).toBeTruthy()
  expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
})

test('the grade question and its choices can be read aloud', async () => {
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
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Read aloud' }))

  expect(speak.mock.calls[0][0].text).toBe(
    'What grade are you in? Kindergarten and 1st grade. 2nd and 3rd grade. 4th and 5th grade.',
  )
})

test('picking 2nd & 3rd grade saves it and puts that shelf first', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: '2nd & 3rd grade' }))

  expect(localStorage.getItem('grade_band')).toBe('2-3')
  expect(shelvesInOrder()).toEqual(['2nd & 3rd grade', 'Kindergarten & 1st grade', '4th & 5th grade'])
  expect(gameTitlesInOrder()).toEqual([
    'For Keeps',
    'Subtraction',
    'Addition',
    'Addition War',
    'Take-Away War',
    'Decimal War',
    'Multiplication',
    'Division',
  ])
})

test('picking 4th & 5th grade puts its shelf first with games against Robo before workshops', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: '4th & 5th grade' }))

  expect(shelvesInOrder()).toEqual(['4th & 5th grade', 'Kindergarten & 1st grade', '2nd & 3rd grade'])
  const shelf = screen.getByRole('region', { name: '4th & 5th grade' })
  expect(within(shelf).getByText('Your grade')).toBeTruthy()
  expect(within(shelf).getByText('Games against Robo')).toBeTruthy()
  expect(within(shelf).getByText('Skill workshops')).toBeTruthy()
  expect(gameTitlesInOrder()).toEqual([
    'Decimal War',
    'Multiplication',
    'Division',
    'Addition War',
    'Take-Away War',
    'For Keeps',
    'Subtraction',
    'Addition',
  ])
})

test('only the student’s shelf says Your grade', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: '4th & 5th grade' }))

  expect(screen.getAllByText('Your grade')).toHaveLength(1)
  expect(within(screen.getByRole('region', { name: '2nd & 3rd grade' })).queryByText('Your grade')).toBeNull()
})

test('kindergarten & 1st grade shows Addition War and Take-Away War against Robo and keeps every game playable', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Kindergarten & 1st grade' }))

  expect(shelvesInOrder()[0]).toBe('Kindergarten & 1st grade')
  const shelf = screen.getByRole('region', { name: 'Kindergarten & 1st grade' })
  expect(within(shelf).getByText('Games against Robo')).toBeTruthy()
  const additionWar = within(shelf).getByRole('link', { name: /Addition War/ })
  const takeAwayWar = within(shelf).getByRole('link', { name: /Take-Away War/ })
  expect(additionWar.getAttribute('href')).toBe('/curriculum/addition-war')
  expect(takeAwayWar.getAttribute('href')).toBe('/curriculum/take-away-war')
  expect(within(additionWar).getByText('vs Robo')).toBeTruthy()
  expect(within(takeAwayWar).getByText('vs Robo')).toBeTruthy()
  expect(screen.queryByText(/on the way/)).toBeNull()
  expect(gameTitlesInOrder()).toHaveLength(8)
})

test('only games against Robo carry the vs Robo tag', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  expect(within(screen.getByRole('link', { name: /Decimal War/ })).getByText('vs Robo')).toBeTruthy()
  expect(within(screen.getByRole('link', { name: /Multiplication/ })).queryByText('vs Robo')).toBeNull()
})

test('a return visit skips the grade question', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  expect(screen.queryByRole('heading', { name: 'What grade are you in?' })).toBeNull()
  expect(gameTitlesInOrder()[0]).toBe('Decimal War')
  expect(screen.getByRole('button', { name: 'Sound on' })).toBeTruthy()
})

test('the Decimal War box opens its game', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  const box = screen.getByRole('link', { name: /Decimal War/ })
  expect(box.getAttribute('href')).toBe('/curriculum/decimal-war')
})

test('the For Keeps box sits on the 2nd & 3rd grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '2nd & 3rd grade' })
  const box = within(shelf).getByRole('link', { name: /For Keeps/ })
  expect(box.getAttribute('href')).toBe('/curriculum/for-keeps')
  expect(within(box).getByText('vs Robo')).toBeTruthy()
  expect(within(shelf).getByText('Games against Robo')).toBeTruthy()
})

test('Change grade asks the grade question again', async () => {
  const user = userEvent.setup()
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Change grade' }))

  expect(screen.getByRole('heading', { name: 'What grade are you in?' })).toBeTruthy()
})
