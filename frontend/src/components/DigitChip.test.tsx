import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import DigitChip from './DigitChip'

test('shows a place letter and names the place for screen readers', () => {
  render(<DigitChip digit={7} column="hundreds" />)

  expect(screen.getByText('H').getAttribute('aria-hidden')).toBe('true')
  expect(screen.getByText('hundreds').className).toContain('sr-only')
})

test('uses a two-letter label for thousands', () => {
  render(<DigitChip digit={1} column="thousands" />)

  expect(screen.getByText('Th')).toBeTruthy()
})
