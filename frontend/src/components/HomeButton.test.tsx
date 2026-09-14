import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'
import HomeButton from './HomeButton'

function renderOnPracticePage() {
  render(
    <MemoryRouter initialEntries={['/practice/subtraction']}>
      <Routes>
        <Route path="/" element={<p>Home screen</p>} />
        <Route path="/practice/:gameId" element={<HomeButton />} />
      </Routes>
    </MemoryRouter>,
  )
}

test('tapping Home asks before leaving', async () => {
  const user = userEvent.setup()
  renderOnPracticePage()

  await user.click(screen.getByRole('button', { name: 'Home' }))

  expect(screen.getByRole('alertdialog', { name: 'Leave this problem?' })).toBeTruthy()
  expect(screen.queryByText('Home screen')).toBeNull()
})

test('the confirm panel puts focus on Keep playing', async () => {
  const user = userEvent.setup()
  renderOnPracticePage()

  await user.click(screen.getByRole('button', { name: 'Home' }))

  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep playing' }))
})

test('Keep playing closes the panel and stays on the problem', async () => {
  const user = userEvent.setup()
  renderOnPracticePage()

  await user.click(screen.getByRole('button', { name: 'Home' }))
  await user.click(screen.getByRole('button', { name: 'Keep playing' }))

  expect(screen.queryByRole('alertdialog')).toBeNull()
  expect(screen.getByRole('button', { name: 'Home' })).toBeTruthy()
})

test('Escape closes the panel', async () => {
  const user = userEvent.setup()
  renderOnPracticePage()

  await user.click(screen.getByRole('button', { name: 'Home' }))
  await user.keyboard('{Escape}')

  expect(screen.queryByRole('alertdialog')).toBeNull()
})

test('Yes, go home leaves for the home screen', async () => {
  const user = userEvent.setup()
  renderOnPracticePage()

  await user.click(screen.getByRole('button', { name: 'Home' }))
  await user.click(screen.getByRole('button', { name: 'Yes, go home' }))

  expect(await screen.findByText('Home screen')).toBeTruthy()
})
