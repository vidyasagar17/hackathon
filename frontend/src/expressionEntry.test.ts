import { expect, test } from 'vitest'
import { canTap, expressionText, isComplete, type Token } from './expressionEntry'

const CARDS = [3, 5, 3, 1]

test('an expression starts with a card or (', () => {
  expect(canTap([], 0, 4)).toBe(true)
  expect(canTap([], '(', 4)).toBe(true)
  expect(canTap([], '+', 4)).toBe(false)
  expect(canTap([], ')', 4)).toBe(false)
})

test('each card can be used once', () => {
  expect(canTap([0, '+'], 0, 4)).toBe(false)
  expect(canTap([0, '+'], 1, 4)).toBe(true)
})

test('an operator follows a number or ) only while cards are left', () => {
  expect(canTap([0], '*', 4)).toBe(true)
  expect(canTap([0, '+'], '*', 4)).toBe(false)
  expect(canTap(['(', 0, '+', 1, ')'], '-', 4)).toBe(true)
  expect(canTap([0, '+', 1, '+', 2, '+', 3], '+', 4)).toBe(false)
})

test(') only closes an open ( after a number', () => {
  expect(canTap([0, '+', 1], ')', 4)).toBe(false)
  expect(canTap(['(', 0, '+'], ')', 4)).toBe(false)
  expect(canTap(['(', 0, '+', 1], ')', 4)).toBe(true)
})

test('( needs a card left to go inside it', () => {
  expect(canTap([0, '+', 1, '+', 2, '+'], '(', 4)).toBe(true)
  expect(canTap([0, '+', 1, '+', 2, '+', '('], '(', 4)).toBe(true)
  expect(canTap([0, '+', 1, '+', 2, '+', 3], '(', 4)).toBe(false)
})

test('an expression is long enough for plenty of parentheses but not endless', () => {
  const nested: Token[] = Array(31).fill('(')
  expect(canTap(nested.slice(0, 30), '(', 4)).toBe(true)
  expect(canTap(nested, '(', 4)).toBe(false)
})

test('an expression is complete when every card is used and every ( is closed', () => {
  expect(isComplete([0, '+', 1, '*', 2, '*', 3], 4)).toBe(true)
  expect(isComplete(['(', 0, '+', 1, ')', '*', 2, '*', 3], 4)).toBe(true)
  expect(isComplete(['(', 0, '+', 1, '*', 2, '*', 3], 4)).toBe(false)
  expect(isComplete([0, '+', 1, '*', 2], 4)).toBe(false)
})

test('the expression reads with the card numbers and the math signs', () => {
  expect(expressionText(['(', 0, '+', 1, ')', '*', 2, '/', 3], CARDS)).toBe('(3 + 5) × 3 ÷ 1')
  expect(expressionText([0, '-', '(', '(', 1, '*', 2, ')', ')'], CARDS)).toBe('3 − ((5 × 3))')
  expect(expressionText([], CARDS)).toBe('')
})
