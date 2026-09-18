import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import GradePicker from './GradePicker'

test('renders the grade question and three grade band choices', () => {
  render(<GradePicker onPick={vi.fn()} />)

  expect(screen.getByRole('heading', { name: 'What grade are you in?' })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Kindergarten & 1st grade/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /2nd & 3rd grade/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /4th & 5th grade/ })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Back to games' })).toBeNull()
})

test('clicking a grade band calls onPick with that band', async () => {
  const onPick = vi.fn()
  const user = userEvent.setup()
  render(<GradePicker onPick={onPick} />)

  await user.click(screen.getByRole('button', { name: /2nd & 3rd grade/ }))
  expect(onPick).toHaveBeenCalledWith('2-3')
})

test('shows a Current badge when currentBand matches a choice', () => {
  render(<GradePicker onPick={vi.fn()} currentBand="4-5" />)

  const choice = screen.getByRole('button', { name: /4th & 5th grade/ })
  expect(choice.textContent).toContain('Current')
})

test('renders Back to games button when onCancel is provided', async () => {
  const onCancel = vi.fn()
  const user = userEvent.setup()
  render(<GradePicker onPick={vi.fn()} onCancel={onCancel} currentBand="2-3" />)

  const backButton = screen.getByRole('button', { name: 'Back to games' })
  expect(backButton).toBeTruthy()

  await user.click(backButton)
  expect(onCancel).toHaveBeenCalledOnce()
})
