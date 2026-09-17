import { expect, test } from 'vitest'
import { handAngles } from './clock'

test('the hour hand turns half a degree a minute and the minute hand six degrees', () => {
  expect(handAngles([170, 50])).toEqual({ hour: 85, minute: 300 })
  expect(handAngles([0, 0])).toEqual({ hour: 0, minute: 0 })
  expect(handAngles([270, 30])).toEqual({ hour: 135, minute: 180 })
})
