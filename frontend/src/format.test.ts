import { expect, test } from 'vitest'
import { formatGameName, formatMisconception } from './format'

test('game ids become title-case names, including curriculum ids with hyphens', () => {
  expect(formatGameName('subtraction')).toBe('Subtraction')
  expect(formatGameName('decimal-war')).toBe('Decimal War')
})

test('misconception names read as words', () => {
  expect(formatMisconception('longer_is_larger')).toBe('longer is larger')
})
