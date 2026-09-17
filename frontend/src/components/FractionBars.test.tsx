import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import FractionBars from './FractionBars'

function widths(container: HTMLElement, selector: string) {
  return [...container.querySelectorAll(selector)].map((element) => Number(element.getAttribute('width')))
}

test('each card is a bar of the same length cut into its parts with its top shaded', () => {
  const { container } = render(
    <FractionBars
      cards={[
        { top: 1, bottom: 2 },
        { top: 2, bottom: 3 },
      ]}
    />,
  )

  expect(
    screen.getByRole('img', { name: 'Fraction bars. 1/2: 1 of 2 parts shaded, 2/3: 2 of 3 parts shaded' }),
  ).toBeTruthy()
  expect(container.querySelectorAll('[data-cut]')).toHaveLength(1 + 2)
  const [half, twoThirds] = widths(container, '[data-shaded]')
  expect(twoThirds).toBeGreaterThan(half)
})

test('equal fractions shade the same length and end on the guide line', () => {
  const { container } = render(
    <FractionBars
      cards={[
        { top: 1, bottom: 2 },
        { top: 4, bottom: 8 },
      ]}
    />,
  )

  const [half, fourEighths] = widths(container, '[data-shaded]')
  expect(fourEighths).toBeCloseTo(half)
  const shadedEnd = Number(container.querySelector('[data-shaded]')!.getAttribute('x')) + half
  expect(Number(container.querySelector('[data-guide]')!.getAttribute('x1'))).toBeCloseTo(shadedEnd)
})

test('a hundredths bar shows its shaded length without 100 cut lines', () => {
  const { container } = render(
    <FractionBars
      cards={[
        { top: 1, bottom: 4 },
        { top: 25, bottom: 100 },
      ]}
    />,
  )

  expect(container.querySelectorAll('[data-cut]')).toHaveLength(3)
  const [quarter, hundredths] = widths(container, '[data-shaded]')
  expect(hundredths).toBeCloseTo(quarter)
})
