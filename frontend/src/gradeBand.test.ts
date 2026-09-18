import { expect, test } from 'vitest'
import { AGES, bandForAge } from './gradeBand'

test('5 and 6 year olds start on the kindergarten and 1st grade shelf', () => {
  expect(bandForAge(5)).toBe('k-1')
  expect(bandForAge(6)).toBe('k-1')
})

test('7 and 8 year olds start on the 2nd and 3rd grade shelf', () => {
  expect(bandForAge(7)).toBe('2-3')
  expect(bandForAge(8)).toBe('2-3')
})

test('9 and 10 year olds start on the 4th and 5th grade shelf', () => {
  expect(bandForAge(9)).toBe('4-5')
  expect(bandForAge(10)).toBe('4-5')
})

test('an age either side of K-5 is pulled to the nearest shelf, never refused', () => {
  expect(bandForAge(4)).toBe('k-1')
  expect(bandForAge(11)).toBe('4-5')
})

test('every age the question offers maps to a shelf', () => {
  expect(AGES.map(bandForAge)).toEqual(['k-1', 'k-1', 'k-1', '2-3', '2-3', '4-5', '4-5', '4-5'])
})
