import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, test, vi } from 'vitest'
import IntroGate from './IntroGate'

vi.mock('../sound', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sound')>()),
  playSound: vi.fn(),
}))

const mounted = vi.fn()

function FakeGame({ name }: { name: string }) {
  mounted(name)
  return <p>{name} is dealing</p>
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route element={<IntroGate />}>
          <Route path="/curriculum/shut-the-box" element={<FakeGame name="Shut the Box" />} />
          <Route path="/curriculum/not-a-game" element={<FakeGame name="Unknown" />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mounted.mockClear()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  Element.prototype.animate = vi.fn() as unknown as Element['animate']
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
})

test('a game opens on its intro, and the game only mounts after Play', async () => {
  const user = userEvent.setup()
  renderAt('/curriculum/shut-the-box')

  expect(screen.getByRole('heading', { level: 1, name: 'Shut the Box' })).toBeTruthy()
  expect(mounted).not.toHaveBeenCalled()

  await user.click(screen.getAllByRole('button', { name: 'Play!' })[0])

  expect(screen.getByText('Shut the Box is dealing')).toBeTruthy()
})

test('Home on the intro goes straight home, with no leave-this-problem question', async () => {
  const user = userEvent.setup()
  renderAt('/curriculum/shut-the-box')

  await user.click(screen.getByRole('button', { name: 'Home' }))

  expect(screen.getByText('Home')).toBeTruthy()
  expect(mounted).not.toHaveBeenCalled()
})

test('a page with no intro shows straight away', () => {
  renderAt('/curriculum/not-a-game')

  expect(screen.getByText('Unknown is dealing')).toBeTruthy()
})
