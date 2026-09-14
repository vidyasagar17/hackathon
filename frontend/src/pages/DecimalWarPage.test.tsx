import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import DecimalWarPage from './DecimalWarPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const HINT = 'Give both numbers the same number of digits: 0.45 and 0.80.'

function roundPayload(level = 2, choices = ['mine', 'robo']) {
  return {
    round_id: 'round-1',
    visible_state: { level, mine: '0.45', robo: '0.8', choices, pick: null, correct_pick: null },
    progress: { level, correct_in_a_row: 1, needed: 3, top_level: 3 },
  }
}

let round = roundPayload()
let moveResult = { correct: false, misconception: 'longer_is_larger' as string | null }

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/decimal-war/rounds')) return jsonResponse(round)
  if (url.endsWith('/moves')) {
    const pick = JSON.parse(String(init?.body)).move.pick
    return jsonResponse({
      ...moveResult,
      visible_state: { ...round.visible_state, pick, correct_pick: 'robo' },
    })
  }
  return jsonResponse({ misconception: 'longer_is_larger', hint: HINT })
}

function callsTo(ending: string) {
  return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith(ending))
}

beforeEach(() => {
  round = roundPayload()
  moveResult = { correct: false, misconception: 'longer_is_larger' }
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
    <MemoryRouter initialEntries={['/curriculum/decimal-war']}>
      <Routes>
        <Route path="/curriculum/decimal-war" element={<DecimalWarPage />} />
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

test('both numbers are choices and there is no same button below level 3', async () => {
  renderPage()

  expect(await screen.findByRole('button', { name: 'Your number, 0.45' })).toBeTruthy()
  expect(screen.getByRole('button', { name: "Robo's number, 0.8" })).toBeTruthy()
  expect(screen.queryByRole('button', { name: "They're the same" })).toBeNull()
  expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy()
})

test("level 3 adds They're the same", async () => {
  round = roundPayload(3, ['mine', 'robo', 'same'])
  renderPage()

  expect(await screen.findByRole('button', { name: "They're the same" })).toBeTruthy()
})

test('a correct pick says Correct! and fills a star', async () => {
  moveResult = { correct: true, misconception: null }
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: "Robo's number, 0.8" }))

  expect(await screen.findByText('Correct!')).toBeTruthy()
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('correct')
  expect(screen.getByRole('button', { name: 'Next round' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Show me why' })).toBeNull()
})

test('a wrong pick names the larger number and offers Show me why without asking for a hint', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Your number, 0.45' }))

  expect(await screen.findByText('Not quite — 0.8 is larger.')).toBeTruthy()
  const roboCard = screen.getByRole('button', { name: "Robo's number, 0.8" })
  expect(within(roboCard).getByText('Larger')).toBeTruthy()
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('button', { name: 'Show me why' })).toBeTruthy()
  expect(callsTo('/hint')).toHaveLength(0)
})

test('Show me why shows the hint, a read-aloud button and the diagnosed pattern', async () => {
  stubSpeech()
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Your number, 0.45' }))
  await user.click(await screen.findByRole('button', { name: 'Show me why' }))

  expect(await screen.findByText(HINT)).toBeTruthy()
  expect(screen.getByRole('img', { name: '0.45 shaded: 45 of 100 squares' })).toBeTruthy()
  expect(screen.getByRole('img', { name: '0.8 shaded: 80 of 100 squares' })).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: longer is larger')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Read the hint aloud' })).toBeTruthy()
  expect(callsTo('/rounds/round-1/hint')).toHaveLength(1)
})

test('a double tap on a number sends one move', async () => {
  let finishMove = () => {}
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (!url.endsWith('/moves')) return fakeApi(url, init)
      return new Promise((resolve) => {
        finishMove = () => resolve(fakeApi(url, init))
      }).then((response) => response)
    }),
  )
  const user = userEvent.setup()
  renderPage()

  const mine = await screen.findByRole('button', { name: 'Your number, 0.45' })
  await user.click(mine)
  await user.click(mine)
  finishMove()

  expect(await screen.findByText('Not quite — 0.8 is larger.')).toBeTruthy()
  expect(callsTo('/moves')).toHaveLength(1)
})

test('a hint that arrives after Next round never shows on the new round', async () => {
  const hintReplies: (() => void)[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (!url.endsWith('/hint')) return fakeApi(url, init)
      return new Promise((resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        hintReplies.push(() => resolve(fakeApi(url, init)))
      })
    }),
  )
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Your number, 0.45' }))
  await user.click(await screen.findByRole('button', { name: 'Show me why' }))
  await user.click(screen.getByRole('button', { name: 'Next round' }))
  await screen.findByRole('img', { name: '1 of 3 stars' })
  hintReplies[0]()

  await user.click(await screen.findByRole('button', { name: 'Your number, 0.45' }))

  expect(await screen.findByRole('button', { name: 'Show me why' })).toBeTruthy()
  expect(screen.queryByText(HINT)).toBeNull()
})
