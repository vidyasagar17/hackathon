import { expect, test } from 'vitest'
import { formatGameName, formatMisconception } from './format'

test('game ids become title-case names, including curriculum ids with hyphens', () => {
  expect(formatGameName('subtraction')).toBe('Subtraction')
  expect(formatGameName('decimal-war')).toBe('Decimal War')
})

test('names title-casing gets wrong use their real spelling', () => {
  expect(formatGameName('dont-break-the-bank')).toBe("Don't Break the Bank")
  expect(formatGameName('shut-the-box')).toBe('Shut the Box')
  expect(formatGameName('take-away-war')).toBe('Take-Away War')
  expect(formatGameName('the-24-game')).toBe('The 24 Game')
})

test('misconception names read as words', () => {
  expect(formatMisconception('longer_is_larger')).toBe('longer is larger')
})
