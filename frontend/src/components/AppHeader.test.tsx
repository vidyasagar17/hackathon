import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import AppHeader from './AppHeader'

test('renders a header landmark with content on both sides', () => {
  render(<AppHeader left={<span>Number Quest</span>} right={<button type="button">Change grade</button>} />)

  const header = screen.getByRole('banner')
  expect(within(header).getByText('Number Quest')).toBeTruthy()
  expect(within(header).getByRole('button', { name: 'Change grade' })).toBeTruthy()
})
