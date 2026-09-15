import { expect, test } from 'vitest'
import { columnEntryOrder, shiftIntoPlaces } from './answerEntry'

const PLACES = ['hundreds', 'tens', 'ones'] as const

test('column entry starts at the ones place and moves left', () => {
  expect(columnEntryOrder([...PLACES])).toEqual(['ones', 'tens', 'hundreds'])
})

test('a typed number is right-aligned across the boxes', () => {
  const answers = shiftIntoPlaces([...PLACES], '21')

  expect([answers.hundreds, answers.tens, answers.ones]).toEqual(['', '2', '1'])
})

test('typing more digits than boxes keeps the last ones', () => {
  const answers = shiftIntoPlaces([...PLACES], '1234')

  expect([answers.hundreds, answers.tens, answers.ones]).toEqual(['2', '3', '4'])
})

test('nothing typed leaves every box empty', () => {
  const answers = shiftIntoPlaces([...PLACES], '')

  expect([answers.hundreds, answers.tens, answers.ones]).toEqual(['', '', ''])
})
