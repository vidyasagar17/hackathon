import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test } from 'vitest'
import MuteToggle from './MuteToggle'

beforeEach(() => {
  localStorage.clear()
})

test('sound starts on', () => {
  render(<MuteToggle />)

  expect(screen.getByRole('button', { name: 'Sound on' })).toBeTruthy()
})

test('tapping the switch turns sound off and saves it', async () => {
  const user = userEvent.setup()
  render(<MuteToggle />)

  await user.click(screen.getByRole('button', { name: 'Sound on' }))

  expect(screen.getByRole('button', { name: 'Sound off' })).toBeTruthy()
  expect(localStorage.getItem('sound_muted')).toBe('true')
})

test('a saved choice is used on the next visit', () => {
  localStorage.setItem('sound_muted', 'true')
  render(<MuteToggle />)

  expect(screen.getByRole('button', { name: 'Sound off' })).toBeTruthy()
})
