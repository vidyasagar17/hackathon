import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import GameIntro from '../components/GameIntro'
import { GAMES, gameId } from '../gameCatalog'
import { INTROS } from '.'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

let reducedMotion = false
const animate = vi.fn()

beforeEach(() => {
  reducedMotion = false
  animate.mockClear()
  Element.prototype.animate = animate as unknown as Element['animate']
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reducedMotion })))
})

/** Click Next through every demo step, noting how many pieces moved on each one. */
async function movesPerStep(id: string) {
  const game = GAMES.find((entry) => gameId(entry) === id)!
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <GameIntro game={game} intro={INTROS[id]} onPlay={() => {}} />
    </MemoryRouter>,
  )
  const moves: number[] = []
  for (let step = 1; step < INTROS[id].steps.length; step += 1) {
    animate.mockClear()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    moves.push(animate.mock.calls.length)
  }
  return moves
}

test('every game on the home screen has an intro', () => {
  expect(GAMES.map(gameId).filter((id) => !INTROS[id])).toEqual([])
})

test.each(Object.keys(INTROS))('%s: the try-it question has one right choice among distinct choices', (id) => {
  const { choices, answer } = INTROS[id].tryIt
  expect(choices).toContain(answer)
  expect(new Set(choices).size).toBe(choices.length)
  expect(choices.length).toBeGreaterThanOrEqual(2)
})

test.each(Object.keys(INTROS))('%s: each demo step moves at most one piece', async (id) => {
  const moves = await movesPerStep(id)

  expect(moves.every((count) => count <= 1)).toBe(true)
  expect(moves.some((count) => count === 1)).toBe(true)
})

test.each(Object.keys(INTROS))('%s: nothing moves under reduced motion', async (id) => {
  reducedMotion = true

  const moves = await movesPerStep(id)

  expect(moves.every((count) => count === 0)).toBe(true)
})
