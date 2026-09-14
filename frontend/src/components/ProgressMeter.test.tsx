import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import ProgressMeter from './ProgressMeter'

test('shows the level, filled stars, and how many more are needed', () => {
  render(<ProgressMeter progress={{ level: 2, correct_in_a_row: 1, needed: 3, top_level: 3 }} />)

  expect(screen.getByText('Level 2')).toBeTruthy()
  expect(screen.getByRole('img', { name: '1 of 3 stars' })).toBeTruthy()
  expect(screen.getByText('2 more right in a row to reach Level 3')).toBeTruthy()
})

test('says the next level is coming once every star is filled', () => {
  render(<ProgressMeter progress={{ level: 1, correct_in_a_row: 3, needed: 3, top_level: 3 }} />)

  expect(screen.getByText('Level 2 is next!')).toBeTruthy()
})

test('says top level at the highest level', () => {
  render(<ProgressMeter progress={{ level: 3, correct_in_a_row: 2, needed: 3, top_level: 3 }} />)

  expect(screen.getByText('Top level!')).toBeTruthy()
})
