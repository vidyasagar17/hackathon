import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import HundredthsGrid from './HundredthsGrid'

function shaded(container: HTMLElement, kind: 'square' | 'sliver') {
  return container.querySelectorAll(`[data-shaded="${kind}"]`)
}

test('0.45 shades 45 whole squares out of 100', () => {
  const { container } = render(<HundredthsGrid digits="45" places={2} />)

  expect(screen.getByRole('img', { name: '0.45 shaded: 45 of 100 squares' })).toBeTruthy()
  expect(shaded(container, 'square')).toHaveLength(45)
  expect(shaded(container, 'sliver')).toHaveLength(0)
  expect(screen.getByText('0.45 = 45 hundredths')).toBeTruthy()
})

test('0.8 beside a hundredths number fills 8 whole columns and is written as 80 hundredths', () => {
  const { container } = render(<HundredthsGrid digits="8" places={2} />)

  const squares = shaded(container, 'square')
  expect(squares).toHaveLength(80)
  expect([...squares].every((square) => Number(square.getAttribute('data-column')) < 8)).toBe(true)
  expect(screen.getByText('0.8 = 80 hundredths')).toBeTruthy()
})

test('a thousandths digit shades that many slivers of one square', () => {
  const { container } = render(<HundredthsGrid digits="405" places={3} />)

  expect(screen.getByRole('img', { name: '0.405 shaded: 40.5 of 100 squares' })).toBeTruthy()
  expect(shaded(container, 'square')).toHaveLength(40)
  expect(shaded(container, 'sliver')).toHaveLength(5)
  expect(screen.getByText('0.405 = 405 thousandths')).toBeTruthy()
})

test('numbers compared in tenths are written in tenths', () => {
  const { container } = render(<HundredthsGrid digits="3" places={1} />)

  expect(shaded(container, 'square')).toHaveLength(30)
  expect(screen.getByText('0.3 = 3 tenths')).toBeTruthy()
})

test('a count of one is singular', () => {
  render(<HundredthsGrid digits="01" places={2} />)

  expect(screen.getByText('0.01 = 1 hundredth')).toBeTruthy()
})
