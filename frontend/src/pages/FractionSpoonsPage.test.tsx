import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { playSound } from '../sound'
import FractionSpoonsPage from './FractionSpoonsPage'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

type Fraction = { top: number; bottom: number }

const card = (top: number, bottom: number): Fraction => ({ top, bottom })

const MY_CARDS = [card(1, 2), card(2, 4), card(3, 6), card(1, 3)]

const ROBO_SET = [card(1, 3), card(2, 6), card(3, 9), card(4, 12)]

const SAME_DIFFERENCE_HINT =
  '1/2 is 1/2 short of 1, and 2/3 is 1/3 short of 1. 1/3 is smaller than 1/2, so 2/3 is bigger than 1/2.'

const GENERAL_HINT = 'Two fractions are the same size when the top and the bottom are × the same number.'

type FitReply = { correct: boolean; misconception: string | null }

type HintReply = { misconception: string | null; hint: string; cards: Fraction[] | null }

type ClaimReply = { correct: boolean; misconception: string | null; state: Record<string, unknown> }

let dealFails = false
let movesFail = false
let hintFails = false
let trashTop: Fraction | null = null
let holdMoves = false
let releaseMove: () => void = () => {}
let startStars = 0
let drawnCard = card(2, 3)
let fitReply: FitReply = { correct: false, misconception: 'same_difference_means_equal' }
let hintReply: HintReply = {
  misconception: 'same_difference_means_equal',
  hint: SAME_DIFFERENCE_HINT,
  cards: [card(1, 2), card(2, 3)],
}
let canClaim = true
let claimReply: ClaimReply = { correct: true, misconception: null, state: {} }
let roboState: Record<string, unknown> = {}

function visibleState(overrides: Record<string, unknown> = {}) {
  return {
    level: 1,
    hand_number: 1,
    step: 'collect',
    my_cards: MY_CARDS,
    collecting: null,
    drawn: null,
    trash_top: trashTop,
    pile_count: 22,
    my_spoons: 0,
    robo_spoons: 0,
    can_claim: false,
    robo_discard: null,
    robo_spoon_cards: null,
    ...overrides,
  }
}

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: () => Promise.resolve(body) })
}

function ungraded(overrides: Record<string, unknown>) {
  return { correct: true, misconception: null, visible_state: visibleState(overrides) }
}

function moveReply(move: { type: string; card?: number }) {
  const afterDraw = { collecting: MY_CARDS[0], drawn: drawnCard, pile_count: 21 }
  switch (move.type) {
    case 'collect':
      return ungraded({ step: 'draw', collecting: MY_CARDS[move.card as number] })
    case 'draw':
      return ungraded({ step: 'fit', ...afterDraw })
    case 'fit':
      return { ...fitReply, visible_state: visibleState({ step: 'discard', ...afterDraw }) }
    case 'discard': {
      const cards = [...MY_CARDS, drawnCard]
      const [thrown] = cards.splice(move.card as number, 1)
      return ungraded({ step: 'choose', my_cards: cards, collecting: MY_CARDS[0], trash_top: thrown, pile_count: 21, can_claim: canClaim })
    }
    case 'claim':
      return { correct: claimReply.correct, misconception: claimReply.misconception, visible_state: visibleState(claimReply.state) }
    default:
      return ungraded({ pile_count: 20, ...roboState })
  }
}

function fakeApi(url: string, init?: RequestInit) {
  if (url.includes('/curriculum/fraction-spoons/rounds')) {
    if (dealFails) return jsonResponse({ detail: 'nope' }, false)
    return jsonResponse({
      round_id: 'round-1',
      visible_state: visibleState(),
      progress: { level: 1, correct_in_a_row: startStars, needed: 3, top_level: 3 },
    })
  }
  if (url.endsWith('/hint')) return hintFails ? jsonResponse({ detail: 'nope' }, false) : jsonResponse(hintReply)
  if (movesFail) return jsonResponse({ detail: 'nope' }, false)
  const reply = moveReply(JSON.parse(String(init?.body)).move)
  if (!holdMoves) return jsonResponse(reply)
  return new Promise((resolve) => {
    releaseMove = () => resolve({ ok: true, json: () => Promise.resolve(reply) })
  })
}

function movesSent() {
  return vi
    .mocked(fetch)
    .mock.calls.filter(([url]) => String(url).endsWith('/moves'))
    .map(([, init]) => JSON.parse(String(init?.body)).move)
}

function callsTo(path: string) {
  return vi.mocked(fetch).mock.calls.filter(([url]) => String(url).includes(path))
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/curriculum/fraction-spoons']}>
      <Routes>
        <Route path="/curriculum/fraction-spoons" element={<FractionSpoonsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

type User = ReturnType<typeof userEvent.setup>

async function drawCard(user: User) {
  await user.click(await screen.findByRole('button', { name: '1/2' }))
  await user.click(await screen.findByRole('button', { name: 'Draw a card' }))
  await screen.findByRole('group', { name: 'You drew' })
}

/** Collect 1/2, draw, say Fits, throw away 1/3; ends at the Take the spoon / Robo's turn choice. */
async function playToChoice(user: User) {
  await drawCard(user)
  await user.click(screen.getByRole('button', { name: 'Fits' }))
  await screen.findByText('Tap a card to throw away.')
  await user.click(screen.getByRole('button', { name: '1/3' }))
  await screen.findByRole('button', { name: "Robo's turn" })
}

beforeEach(() => {
  dealFails = false
  movesFail = false
  hintFails = false
  trashTop = null
  holdMoves = false
  startStars = 0
  drawnCard = card(2, 3)
  fitReply = { correct: false, misconception: 'same_difference_means_equal' }
  hintReply = {
    misconception: 'same_difference_means_equal',
    hint: SAME_DIFFERENCE_HINT,
    cards: [card(1, 2), card(2, 3)],
  }
  canClaim = true
  claimReply = { correct: true, misconception: null, state: {} }
  roboState = {}
  Element.prototype.animate = vi.fn() as unknown as Element['animate']
  vi.stubGlobal('fetch', vi.fn(fakeApi))
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.mocked(playSound).mockClear()
})

test('a dealt hand shows your four cards, Robo face down, the spoons, the pile and the trash', async () => {
  renderPage()

  expect(await screen.findByRole('heading', { name: 'Fraction Spoons' })).toBeTruthy()
  const mySeat = screen.getByRole('group', { name: 'Your cards' })
  expect(within(mySeat).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
    '1/2',
    '2/4',
    '3/6',
    '1/3',
  ])
  expect(within(mySeat).queryByText('You')).toBeNull()
  expect(screen.getByRole('group', { name: 'Robo has 4 cards' })).toBeTruthy()
  expect(screen.getByText('Hand 1')).toBeTruthy()
  expect(screen.getByText('Spoons: You 0, Robo 0')).toBeTruthy()
  expect(screen.getByText('22 cards in the pile')).toBeTruthy()
  expect(screen.getByText('The trash is empty')).toBeTruthy()
  expect(screen.getByText('Tap the card you want to collect.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Draw a card' })).toBeNull()
})

test('tapping a card collects it, marks it and offers the draw', async () => {
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: '3/6' }))

  expect(movesSent()).toEqual([{ type: 'collect', card: 2 }])
  expect(playSound).toHaveBeenCalledWith('tap')
  expect((await screen.findByRole('button', { name: '3/6' })).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: '1/2' }).getAttribute('aria-pressed')).toBe('false')
  expect(screen.getByText('Collecting')).toBeTruthy()
  expect(screen.getByText('Draw a card.')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Draw a card' })).toBeTruthy()
})

test('drawing sends the draw and shows the drawn card and the smaller pile', async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(await screen.findByRole('button', { name: '1/2' }))

  await user.click(await screen.findByRole('button', { name: 'Draw a card' }))

  expect(movesSent()).toEqual([{ type: 'collect', card: 0 }, { type: 'draw' }])
  const drawn = await screen.findByRole('group', { name: 'You drew' })
  expect(within(drawn).getByRole('img', { name: '2/3' })).toBeTruthy()
  expect(screen.getByText('21 cards in the pile')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Draw a card' })).toBeNull()
})

test('a card tapped twice while its move is sending sends one request', async () => {
  holdMoves = true
  const user = userEvent.setup()
  renderPage()
  const button = await screen.findByRole('button', { name: '2/4' })

  await user.click(button)
  await user.click(button)
  releaseMove()

  expect(await screen.findByText('Collecting')).toBeTruthy()
  expect(movesSent()).toEqual([{ type: 'collect', card: 1 }])
})

test('the top of the trash shows face up', async () => {
  trashTop = card(5, 6)
  renderPage()

  const trash = await screen.findByRole('group', { name: 'Top of the trash' })
  expect(within(trash).getByRole('img', { name: '5/6' })).toBeTruthy()
})

test('a move that fails to send says so and keeps the hand', async () => {
  movesFail = true
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: '1/2' }))

  expect(await screen.findByText("Couldn't send your move — try again.")).toBeTruthy()
  expect(screen.getByText('Tap the card you want to collect.')).toBeTruthy()
})

test('a hand that fails to deal offers a retry', async () => {
  dealFails = true
  const user = userEvent.setup()
  renderPage()

  expect(await screen.findByText("Couldn't deal a hand — try again.")).toBeTruthy()
  dealFails = false
  await user.click(screen.getByRole('button', { name: 'Retry' }))

  expect(await screen.findByRole('heading', { name: 'Fraction Spoons' })).toBeTruthy()
})

test('after drawing, the table asks whether the drawn card fits your Collecting card', async () => {
  const user = userEvent.setup()
  renderPage()

  await drawCard(user)

  expect(screen.getByText('Does 2/3 fit with your 1/2?')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Fits' })).toBeTruthy()
  expect(screen.getByRole('button', { name: "Doesn't fit" })).toBeTruthy()
})

test('a right Fits answer says so, plays the correct sound and fills a star', async () => {
  drawnCard = card(4, 8)
  fitReply = { correct: true, misconception: null }
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)

  await user.click(screen.getByRole('button', { name: 'Fits' }))

  expect(await screen.findByText('Right — 4/8 fits with 1/2.')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'fit', fits: true })
  expect(playSound).toHaveBeenCalledWith('correct')
  expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Fits' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Show me why' })).toBeNull()
})

test("a right Doesn't fit answer sends fits false and says the card doesn't fit", async () => {
  fitReply = { correct: true, misconception: null }
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)

  await user.click(screen.getByRole('button', { name: "Doesn't fit" }))

  expect(await screen.findByText("Right — 2/3 doesn't fit with 1/2.")).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'fit', fits: false })
})

test('a wrong answer resets the stars and shows the bars, hint and diagnosed pattern only on Show me why', async () => {
  startStars = 2
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)
  expect(screen.getByRole('img', { name: '2 of 3 stars' })).toBeTruthy()

  await user.click(screen.getByRole('button', { name: 'Fits' }))

  expect(await screen.findByText("Not quite — 2/3 doesn't fit with 1/2.")).toBeTruthy()
  expect(playSound).toHaveBeenCalledWith('wrong')
  expect(screen.getByRole('img', { name: '0 of 3 stars' })).toBeTruthy()
  expect(callsTo('/hint')).toHaveLength(0)
  expect(screen.queryByRole('img', { name: /Fraction bars/ })).toBeNull()

  await user.click(screen.getByRole('button', { name: 'Show me why' }))

  expect(await screen.findByText(SAME_DIFFERENCE_HINT)).toBeTruthy()
  expect(screen.getByRole('img', { name: 'Fraction bars. 1/2: 1 of 2 parts shaded, 2/3: 2 of 3 parts shaded' })).toBeTruthy()
  expect(screen.getByText('Diagnosed pattern: same difference means equal')).toBeTruthy()
  expect(callsTo('/hint')).toHaveLength(1)
  expect(screen.queryByRole('button', { name: 'Show me why' })).toBeNull()
})

test('a wrong answer with no named mistake gets the general hint and no diagnosed pattern', async () => {
  drawnCard = card(4, 8)
  fitReply = { correct: false, misconception: null }
  hintReply = { misconception: null, hint: GENERAL_HINT, cards: null }
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)

  await user.click(screen.getByRole('button', { name: "Doesn't fit" }))
  await user.click(await screen.findByRole('button', { name: 'Show me why' }))

  expect(await screen.findByText(GENERAL_HINT)).toBeTruthy()
  expect(screen.getByText('Not quite — 4/8 fits with 1/2.')).toBeTruthy()
  expect(screen.queryByText(/Diagnosed pattern/)).toBeNull()
  expect(screen.queryByRole('img', { name: /Fraction bars/ })).toBeNull()
})

test('Fits tapped twice while the answer is sending sends one fit move', async () => {
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)
  holdMoves = true
  const fits = screen.getByRole('button', { name: 'Fits' })

  await user.click(fits)
  await user.click(fits)
  releaseMove()

  expect(await screen.findByText("Not quite — 2/3 doesn't fit with 1/2.")).toBeTruthy()
  expect(movesSent().filter((move) => move.type === 'fit')).toHaveLength(1)
})

test('a hint that fails to load says so', async () => {
  hintFails = true
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)
  await user.click(screen.getByRole('button', { name: 'Fits' }))

  await user.click(await screen.findByRole('button', { name: 'Show me why' }))

  expect(await screen.findByText("Couldn't load the hint — try again.")).toBeTruthy()
})

test("after answering, tapping one of your cards throws it away and offers Take the spoon and Robo's turn", async () => {
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)
  await user.click(screen.getByRole('button', { name: 'Fits' }))
  expect(await screen.findByText('Tap a card to throw away.')).toBeTruthy()

  await user.click(screen.getByRole('button', { name: '1/3' }))

  expect(movesSent().at(-1)).toEqual({ type: 'discard', card: 3 })
  expect(playSound).toHaveBeenLastCalledWith('tap')
  const trash = await screen.findByRole('group', { name: 'Top of the trash' })
  expect(within(trash).getByRole('img', { name: '1/3' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Take the spoon' })).toBeTruthy()
  expect(screen.getByRole('button', { name: "Robo's turn" })).toBeTruthy()
  expect(screen.getByText('Take the spoon if all four cards are equal, or let Robo take its turn.')).toBeTruthy()
})

test('throwing a card away clears the fit result and hint, leaving only the two choices', async () => {
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)
  await user.click(screen.getByRole('button', { name: 'Fits' }))
  await user.click(await screen.findByRole('button', { name: 'Show me why' }))
  await screen.findByText(SAME_DIFFERENCE_HINT)

  await user.click(screen.getByRole('button', { name: '1/3' }))

  expect(await screen.findByRole('button', { name: "Robo's turn" })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Take the spoon' })).toBeTruthy()
  expect(screen.queryByText(/Not quite/)).toBeNull()
  expect(screen.queryByText(SAME_DIFFERENCE_HINT)).toBeNull()
  expect(screen.queryByRole('img', { name: /Fraction bars/ })).toBeNull()
})

test('the drawn card can be thrown away too', async () => {
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)
  await user.click(screen.getByRole('button', { name: 'Fits' }))
  await screen.findByText('Tap a card to throw away.')

  await user.click(within(screen.getByRole('group', { name: 'You drew' })).getByRole('button', { name: '2/3' }))

  expect(movesSent().at(-1)).toEqual({ type: 'discard', card: 4 })
  const trash = await screen.findByRole('group', { name: 'Top of the trash' })
  expect(within(trash).getByRole('img', { name: '2/3' })).toBeTruthy()
})

test('Take the spoon is not offered when claiming is closed', async () => {
  canClaim = false
  const user = userEvent.setup()
  renderPage()

  await playToChoice(user)

  expect(screen.queryByRole('button', { name: 'Take the spoon' })).toBeNull()
  expect(screen.getByText('Let Robo take its turn.')).toBeTruthy()
})

test('a correct claim wins the spoon, fills a star and starts the next hand', async () => {
  claimReply = { correct: true, misconception: null, state: { hand_number: 2, my_spoons: 1 } }
  const user = userEvent.setup()
  renderPage()
  await playToChoice(user)

  await user.click(screen.getByRole('button', { name: 'Take the spoon' }))

  expect(await screen.findByText('You took the spoon!')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'claim' })
  expect(playSound).toHaveBeenLastCalledWith('correct')
  expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy()
  expect(screen.getByText('Spoons: You 1, Robo 0')).toBeTruthy()
  expect(screen.getByText('Hand 2')).toBeTruthy()
  expect(screen.getByText('Tap the card you want to collect.')).toBeTruthy()
})

test('a wrong claim is diagnosed, closes the claim and offers the hint', async () => {
  claimReply = {
    correct: false,
    misconception: 'same_difference_means_equal',
    state: { step: 'choose', collecting: MY_CARDS[0], can_claim: false },
  }
  const user = userEvent.setup()
  renderPage()
  await playToChoice(user)

  await user.click(screen.getByRole('button', { name: 'Take the spoon' }))

  expect(await screen.findByText('Not quite — not all four cards are equal to 1/2.')).toBeTruthy()
  expect(playSound).toHaveBeenLastCalledWith('wrong')
  expect(screen.queryByRole('button', { name: 'Take the spoon' })).toBeNull()
  expect(screen.getByRole('button', { name: "Robo's turn" })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Show me why' }))
  expect(await screen.findByText(SAME_DIFFERENCE_HINT)).toBeTruthy()
})

test("Robo's turn shows what Robo threw away and starts your next turn", async () => {
  roboState = { step: 'draw', collecting: MY_CARDS[0], robo_discard: card(5, 6), trash_top: card(5, 6) }
  const user = userEvent.setup()
  renderPage()
  await playToChoice(user)

  await user.click(screen.getByRole('button', { name: "Robo's turn" }))

  expect(await screen.findByText('Robo drew a card and threw away 5/6.')).toBeTruthy()
  expect(movesSent().at(-1)).toEqual({ type: 'robo_turn' })
  expect(screen.getByRole('button', { name: 'Draw a card' })).toBeTruthy()
  expect(screen.queryByText(/Not quite/)).toBeNull()
})

test("when Robo takes a spoon its four cards are shown and the next hand starts", async () => {
  roboState = { hand_number: 2, robo_spoons: 1, robo_spoon_cards: ROBO_SET }
  const user = userEvent.setup()
  renderPage()
  await playToChoice(user)

  await user.click(screen.getByRole('button', { name: "Robo's turn" }))

  expect(await screen.findByText('Robo took the spoon with 1/3, 2/6, 3/9, 4/12.')).toBeTruthy()
  const spoon = screen.getByRole('group', { name: "Robo's spoon" })
  expect(within(spoon).getAllByRole('img').map((image) => image.getAttribute('aria-label'))).toEqual([
    '1/3',
    '2/6',
    '3/9',
    '4/12',
  ])
  expect(screen.getByText('Spoons: You 0, Robo 1')).toBeTruthy()
  expect(screen.getByText('Hand 2')).toBeTruthy()
})

test('when Robo wins the game the result and Play again show, and Play again deals a new game', async () => {
  roboState = { step: 'over', my_spoons: 1, robo_spoons: 3, robo_spoon_cards: ROBO_SET }
  const user = userEvent.setup()
  renderPage()
  await playToChoice(user)

  await user.click(screen.getByRole('button', { name: "Robo's turn" }))

  expect(await screen.findByText('Robo wins the game 3–1.')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Play again' }))
  expect(await screen.findByText('Spoons: You 0, Robo 0')).toBeTruthy()
  expect(callsTo('/curriculum/fraction-spoons/rounds')).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Play again' })).toBeNull()
})

test('when you win the game with a claim the result says so', async () => {
  claimReply = { correct: true, misconception: null, state: { step: 'over', my_spoons: 3, robo_spoons: 2 } }
  const user = userEvent.setup()
  renderPage()
  await playToChoice(user)

  await user.click(screen.getByRole('button', { name: 'Take the spoon' }))

  expect(await screen.findByText('You win the game 3–2!')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Play again' })).toBeTruthy()
})

test("Robo's turn, Take the spoon and a discard each send one move when tapped twice", async () => {
  const user = userEvent.setup()
  renderPage()
  await drawCard(user)
  await user.click(screen.getByRole('button', { name: 'Fits' }))
  await screen.findByText('Tap a card to throw away.')

  holdMoves = true
  const discard = screen.getByRole('button', { name: '1/3' })
  await user.click(discard)
  await user.click(discard)
  releaseMove()
  const claim = await screen.findByRole('button', { name: 'Take the spoon' })
  await user.click(claim)
  await user.click(claim)
  releaseMove()
  await screen.findByText('You took the spoon!')

  expect(movesSent().filter((move) => move.type === 'discard')).toHaveLength(1)
  expect(movesSent().filter((move) => move.type === 'claim')).toHaveLength(1)
})

test("Robo's turn tapped twice while sending sends one move", async () => {
  const user = userEvent.setup()
  renderPage()
  await playToChoice(user)
  holdMoves = true
  const robo = screen.getByRole('button', { name: "Robo's turn" })

  await user.click(robo)
  await user.click(robo)
  releaseMove()

  expect(await screen.findByText('Tap the card you want to collect.')).toBeTruthy()
  expect(movesSent().filter((move) => move.type === 'robo_turn')).toHaveLength(1)
})
