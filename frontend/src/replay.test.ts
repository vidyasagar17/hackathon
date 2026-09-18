import { expect, test } from 'vitest'
import { buildReplaySteps, digitAt, firstDivergence } from './replay'

// 403 - 158, which needs a borrow across the zero. The right answer is 245.
const COLUMNS = [
  { place: 'hundreds' as const, minuend_digit: 4, subtrahend_digit: 1 },
  { place: 'tens' as const, minuend_digit: 0, subtrahend_digit: 5 },
  { place: 'ones' as const, minuend_digit: 3, subtrahend_digit: 8 },
]

function steps(yours: number) {
  return buildReplaySteps(COLUMNS, 'minuend_digit', 'subtrahend_digit', 245, yours)
}

test('a place past the end of the number reads as zero', () => {
  expect(digitAt(45, 'hundreds')).toBe(0)
  expect(digitAt(245, 'tens')).toBe(4)
})

test('the walk runs right to left, the way a student works the columns', () => {
  expect(steps(245).map((step) => step.place)).toEqual(['ones', 'tens', 'hundreds'])
})

test('each step carries the two digits it was worked from', () => {
  const ones = steps(245)[0]

  expect([ones.topDigit, ones.bottomDigit]).toEqual([3, 8])
})

test('a correct answer matches in every place and never diverges', () => {
  const walk = steps(245)

  expect(walk.every((step) => step.matches)).toBe(true)
  expect(firstDivergence(walk)).toBeNull()
})

test('taking the smaller digit from the larger one can land the ones right by chance', () => {
  // 403 - 158 answered 355: |3-8| = 5, |0-5| = 5, |4-1| = 3. The ones happen to agree
  // with the right answer, so the walk pauses at the tens, where the bug first shows.
  const walk = steps(355)

  expect(walk[0]).toMatchObject({ place: 'ones', yours: 5, right: 5, matches: true })
  expect(firstDivergence(walk)).toBe(1)
})

test('an answer that is right in the ones but wrong later diverges there, not at the start', () => {
  // 403 - 158 answered 255: the ones are right, the tens are not.
  const walk = steps(255)

  expect(walk[0].matches).toBe(true)
  expect(firstDivergence(walk)).toBe(1)
  expect(walk[1]).toMatchObject({ place: 'tens', yours: 5, right: 4 })
})

test('a missing leading digit counts as a zero that diverges', () => {
  // Answered 45 where 245 was right: the hundreds place was left empty.
  const walk = steps(45)

  expect(firstDivergence(walk)).toBe(2)
  expect(walk[2]).toMatchObject({ place: 'hundreds', yours: 0, right: 2 })
})

test('a problem with no hundreds column has no hundreds step', () => {
  const walk = buildReplaySteps(
    [
      { place: 'tens', minuend_digit: 7, subtrahend_digit: 5 },
      { place: 'ones', minuend_digit: 3, subtrahend_digit: 8 },
    ],
    'minuend_digit',
    'subtrahend_digit',
    35,
    25,
  )

  expect(walk.map((step) => step.place)).toEqual(['ones', 'tens'])
})
