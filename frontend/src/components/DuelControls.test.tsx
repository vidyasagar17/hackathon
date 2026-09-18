import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { duelOutcome } from '../duel'
import * as sound from '../sound'
import DuelResult from './DuelResult'
import DuelScoreLine from './DuelScoreLine'
import DuelTurnButtons from './DuelTurnButtons'

const playSoundSpy = vi.spyOn(sound, 'playSound').mockImplementation(() => {})

beforeEach(() => {
  playSoundSpy.mockClear()
  Element.prototype.animate = vi.fn() as unknown as Element['animate']
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const noop = () => {}

function turnButtons(update: Partial<Parameters<typeof DuelTurnButtons>[0]> = {}) {
  return render(
    <DuelTurnButtons
      roboDue={false}
      turnDone={false}
      lastTurn={false}
      finished={false}
      nextLabel="Next hand"
      dealing={false}
      onRoboTurn={noop}
      onNext={noop}
      onSeeWhoWon={noop}
      {...update}
    />,
  )
}

function buttonNames() {
  return screen.queryAllByRole('button').map((each) => each.textContent)
}

test('the score line names the turn and both scores', () => {
  render(<DuelScoreLine unit="Hand" at={2} of={5} myPoints={1} roboPoints={3} />)
  expect(screen.getByText('Hand 2 of 5 · You 1 · Robo 3')).toBeTruthy()
})

test.each([
  [3, 1, 'game', 'You win the game!'],
  [1, 3, 'game', 'Robo wins the game.'],
  [2, 2, 'game', "It's a draw!"],
  [3, 1, 'duel', 'You win this duel!'],
  [1, 3, 'duel', 'Robo wins this duel.'],
] as const)('the outcome of %i to %i in a %s is "%s"', (mine, robo, noun, said) => {
  expect(duelOutcome(mine, robo, noun)).toBe(said)
})

test("Robo's turn shows alone while it is due", async () => {
  const onRoboTurn = vi.fn()
  turnButtons({ roboDue: true, onRoboTurn })

  expect(buttonNames()).toEqual(["Robo's turn"])
  await userEvent.click(screen.getByRole('button', { name: "Robo's turn" }))
  expect(onRoboTurn).toHaveBeenCalledTimes(1)
})

test('a finished turn offers the next one, which stays off while dealing', async () => {
  const onNext = vi.fn()
  const { rerender } = turnButtons({ turnDone: true, onNext })

  expect(buttonNames()).toEqual(['Next hand'])
  await userEvent.click(screen.getByRole('button', { name: 'Next hand' }))
  expect(onNext).toHaveBeenCalledTimes(1)

  rerender(
    <DuelTurnButtons
      roboDue={false}
      turnDone
      lastTurn={false}
      finished={false}
      nextLabel="Next hand"
      dealing
      onRoboTurn={noop}
      onNext={onNext}
      onSeeWhoWon={noop}
    />,
  )
  expect((screen.getByRole('button', { name: 'Next hand' }) as HTMLButtonElement).disabled).toBe(true)
})

test('the last turn offers See who won, and nothing once the result shows', async () => {
  const onSeeWhoWon = vi.fn()
  const { unmount } = turnButtons({ turnDone: true, lastTurn: true, onSeeWhoWon })

  expect(buttonNames()).toEqual(['See who won'])
  await userEvent.click(screen.getByRole('button', { name: 'See who won' }))
  expect(onSeeWhoWon).toHaveBeenCalledTimes(1)
  unmount()

  turnButtons({ turnDone: true, lastTurn: true, finished: true })
  expect(buttonNames()).toEqual([])
})

test('the result shows both scores, who won and Play again, which stays off while dealing', async () => {
  const onPlayAgain = vi.fn()
  const { rerender } = render(<DuelResult myPoints={4} roboPoints={2} dealing={false} onPlayAgain={onPlayAgain} />)

  const result = screen.getByRole('group', { name: 'Game result' })
  expect(result.textContent).toContain('You 4 · Robo 2')
  expect(result.textContent).toContain('You win the game!')
  await userEvent.click(screen.getByRole('button', { name: 'Play again' }))
  expect(onPlayAgain).toHaveBeenCalledTimes(1)

  rerender(<DuelResult myPoints={4} roboPoints={2} dealing onPlayAgain={onPlayAgain} />)
  expect((screen.getByRole('button', { name: 'Play again' }) as HTMLButtonElement).disabled).toBe(true)
})

test('a duel result is named for the duel and celebrates a win only when asked', () => {
  const { unmount } = render(<DuelResult myPoints={4} roboPoints={2} noun="duel" card dealing={false} onPlayAgain={noop} />)
  expect(screen.getByRole('group', { name: 'Duel result' }).textContent).toContain('You win this duel!')
  expect(Element.prototype.animate).not.toHaveBeenCalled()
  expect(playSoundSpy).not.toHaveBeenCalled()
  unmount()

  render(<DuelResult myPoints={4} roboPoints={2} noun="duel" card celebrate dealing={false} onPlayAgain={noop} />)
  expect(Element.prototype.animate).toHaveBeenCalledTimes(1)
  expect(playSoundSpy).toHaveBeenCalledWith('victory')
})
