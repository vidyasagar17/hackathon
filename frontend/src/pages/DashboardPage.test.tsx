import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, test, vi } from 'vitest'
import DashboardPage from './DashboardPage'

type Summary = {
  total_attempts: number
  correct_count: number
  misconceptions: { game: string; name: string; count: number }[]
  games: { game: string; total_attempts: number; correct_count: number }[]
}

const PLAYED: Summary = {
  total_attempts: 12,
  correct_count: 7,
  misconceptions: [
    { game: 'clock-match', name: 'read_the_next_hour', count: 1 },
    { game: 'clock-match', name: 'swapped_the_hands', count: 3 },
    { game: 'subtraction', name: 'always_borrow', count: 1 },
    { game: 'subtraction', name: 'no_regroup', count: 2 },
    { game: 'subtraction', name: 'smaller_from_larger', count: 4 },
    { game: 'subtraction', name: 'stops_borrow_at_zero', count: 1 },
  ],
  games: [
    { game: 'clock-match', total_attempts: 4, correct_count: 1 },
    { game: 'decimal-war', total_attempts: 3, correct_count: 3 },
    { game: 'subtraction', total_attempts: 5, correct_count: 3 },
  ],
}

function stubSummary(summary: Summary | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: summary !== null, json: () => Promise.resolve(summary) })),
  )
}

function renderPage() {
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test('the whole session score shows at the top', async () => {
  stubSummary(PLAYED)
  renderPage()

  const total = await screen.findByRole('group', { name: 'Whole session' })
  expect(total.textContent).toContain('7 of 12')
  expect(total.textContent).toContain('answers right')
})

test('each game played gets a card with its title band and its own score, most played first', async () => {
  stubSummary(PLAYED)
  renderPage()

  const cards = await screen.findAllByRole('region')
  expect(cards.map((card) => within(card).getByRole('heading', { level: 2 }).textContent)).toEqual([
    'Subtraction',
    'Clock Match',
    'Decimal War',
  ])
  expect(cards[0].textContent).toContain('3 of 5 right')
  expect(cards[1].textContent).toContain('1 of 4 right')
})

test('a card lists its top three mistakes in words, most often first', async () => {
  stubSummary(PLAYED)
  renderPage()

  const subtraction = await screen.findByRole('region', { name: 'Subtraction' })
  const mistakes = within(subtraction).getAllByRole('listitem').map((item) => item.textContent)

  expect(mistakes).toEqual(['Smaller from larger4 times', 'No regroup2 times', 'Always borrow1 time'])
})

test('a game with no mistakes says so', async () => {
  stubSummary(PLAYED)
  renderPage()

  const decimalWar = await screen.findByRole('region', { name: 'Decimal War' })

  expect(within(decimalWar).getByText('No mistakes in this game.')).toBeTruthy()
  expect(within(decimalWar).queryByRole('list')).toBeNull()
})

test('an empty session shows a friendly start instead of zeros', async () => {
  stubSummary({ total_attempts: 0, correct_count: 0, misconceptions: [], games: [] })
  renderPage()

  expect(await screen.findByText('Nothing played yet')).toBeTruthy()
  expect(screen.getByText('Play any game and your results show up here.')).toBeTruthy()
  expect(screen.queryByText(/0 of 0/)).toBeNull()
  expect(screen.getByRole('link', { name: 'Pick a game' }).getAttribute('href')).toBe('/')
})

test('a summary that fails to load says so', async () => {
  stubSummary(null)
  renderPage()

  expect(await screen.findByText("Couldn't load your summary — try again in a moment.")).toBeTruthy()
})
