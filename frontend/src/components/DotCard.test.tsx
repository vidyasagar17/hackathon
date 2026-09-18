import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import DotCard from './DotCard'

test('a dot card draws one dot at each position the server sent', () => {
  const { container } = render(<DotCard dots={[[20, 30], [70, 40], [45, 80]]} />)

  expect(screen.getByRole('img', { name: '3 dots' })).toBeTruthy()
  const dots = [...container.querySelectorAll('[data-dot]')]
  expect(dots.map((dot) => [dot.getAttribute('cx'), dot.getAttribute('cy')])).toEqual([
    ['20', '30'],
    ['70', '40'],
    ['45', '80'],
  ])
})

test('one dot is named in the singular', () => {
  render(<DotCard dots={[[50, 50]]} size="small" />)
  expect(screen.getByRole('img', { name: '1 dot' })).toBeTruthy()
})
