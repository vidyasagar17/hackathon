import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import RoboBubble from './RoboBubble'

test('RoboBubble renders the message in an accessible status element', () => {
  render(<RoboBubble message="Hello, partner!" />)

  const bubble = screen.getByRole('status')
  expect(bubble).toBeTruthy()
  expect(bubble.textContent).toBe('Hello, partner!')
})

test('RoboBubble renders nothing when message is empty', () => {
  const { container } = render(<RoboBubble message="" />)
  expect(container.firstChild).toBeNull()
})
