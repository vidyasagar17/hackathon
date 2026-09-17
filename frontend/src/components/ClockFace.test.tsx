import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import ClockFace from './ClockFace'

test('a clock face has 12 numerals, 60 ticks and two hands at their angles', () => {
  const { container } = render(<ClockFace clock={[170, 50]} label="A clock" />)

  expect(screen.getByRole('img', { name: 'A clock' })).toBeTruthy()
  expect(container.querySelectorAll('[data-numeral]')).toHaveLength(12)
  expect(container.querySelectorAll('[data-tick]')).toHaveLength(60)
  expect(container.querySelector('[data-hand="hour"]')?.getAttribute('transform')).toBe('rotate(85 50 50)')
  expect(container.querySelector('[data-hand="minute"]')?.getAttribute('transform')).toBe('rotate(300 50 50)')
})
