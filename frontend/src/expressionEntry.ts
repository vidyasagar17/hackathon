/** A tapped token: a card position (0-3), an operator, or a parenthesis, as the server reads it. */
export type Token = number | '+' | '-' | '*' | '/' | '(' | ')'

export type Operator = '+' | '-' | '*' | '/'

export const OPERATORS: Operator[] = ['+', '-', '*', '/']

export const SYMBOLS: Record<Operator, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' }

export const SPOKEN: Record<Operator, string> = { '+': 'plus', '-': 'minus', '*': 'times', '/': 'divided by' }

/** The server's limit on an expression's length. */
const MAX_TOKENS = 31

function expectingNumber(tokens: Token[]) {
  const last = tokens.at(-1)
  return last === undefined || last === '(' || OPERATORS.includes(last as Operator)
}

function openParentheses(tokens: Token[]) {
  return tokens.filter((token) => token === '(').length - tokens.filter((token) => token === ')').length
}

function cardsLeft(tokens: Token[], cardCount: number) {
  return cardCount - tokens.filter((token) => typeof token === 'number').length
}

/**
 * Whether tapping `token` next keeps the expression buildable: a card or ( where a number belongs (each card
 * once), an operator after a number while cards are left, and ) only to close an open (. So a finished
 * expression is always one the server accepts.
 */
export function canTap(tokens: Token[], token: Token, cardCount: number): boolean {
  if (tokens.length >= MAX_TOKENS) return false
  if (typeof token === 'number') return expectingNumber(tokens) && !tokens.includes(token)
  if (token === '(') return expectingNumber(tokens) && cardsLeft(tokens, cardCount) > 0
  if (token === ')') return !expectingNumber(tokens) && openParentheses(tokens) > 0
  return !expectingNumber(tokens) && cardsLeft(tokens, cardCount) > 0
}

/** Every card used, ending on a number or ), with every ( closed. */
export function isComplete(tokens: Token[], cardCount: number): boolean {
  return cardsLeft(tokens, cardCount) === 0 && !expectingNumber(tokens) && openParentheses(tokens) === 0
}

/** The expression as written, with the cards' numbers: (3 + 5) × 3. */
export function expressionText(tokens: Token[], cards: number[]): string {
  return tokens
    .map((token) => (typeof token === 'number' ? String(cards[token]) : token in SYMBOLS ? SYMBOLS[token as Operator] : token))
    .join(' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
}
