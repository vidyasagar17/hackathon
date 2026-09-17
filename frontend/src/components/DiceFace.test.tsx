import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import DiceFace from './DiceFace'

test.each([1, 2, 3, 4, 5, 6])('a die showing %i has that many dots', (value) => {
  const { container } = render(<DiceFace value={value} />)

  expect(container.querySelectorAll('[data-pip]')).toHaveLength(value)
  expect(screen.getByRole('img', { name: value === 1 ? '1 dot' : `${value} dots` })).toBeTruthy()
})

test('no two dots on a face sit in the same place', () => {
  for (const value of [1, 2, 3, 4, 5, 6]) {
    const { container, unmount } = render(<DiceFace value={value} />)
    const places = [...container.querySelectorAll('[data-pip]')].map((pip) => `${pip.getAttribute('cx')},${pip.getAttribute('cy')}`)
    expect(new Set(places).size).toBe(value)
    unmount()
  }
})
