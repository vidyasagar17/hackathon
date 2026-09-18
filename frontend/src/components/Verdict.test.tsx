import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import Verdict from './Verdict'

const SIZE = ['font-display', 'text-2xl', 'font-bold']

test('a right answer is green and a wrong one dark red, both at one size', () => {
  render(
    <>
      <Verdict correct>Correct!</Verdict>
      <Verdict correct={false}>Not quite — try again!</Verdict>
    </>,
  )

  const right = screen.getByText('Correct!')
  const wrong = screen.getByText('Not quite — try again!')
  expect([...right.classList]).toEqual([...SIZE, 'text-success-text'])
  expect([...wrong.classList]).toEqual([...SIZE, 'text-alert-text'])
})
