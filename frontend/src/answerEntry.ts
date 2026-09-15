import type { Column } from './columns'

export type Answers = Record<Column, string>

export const EMPTY_ANSWERS: Answers = { thousands: '', hundreds: '', tens: '', ones: '' }

/** Column games fill answer boxes from the ones place leftward, the order the written method works. */
export function columnEntryOrder(places: Column[]): Column[] {
  return [...places].reverse()
}

/**
 * Right-align a typed number across the answer boxes, like a calculator display.
 * Used where digits are written left to right (division's quotient). Extra leading digits drop off.
 */
export function shiftIntoPlaces(places: Column[], typed: string): Answers {
  const aligned = typed.slice(-places.length).padStart(places.length, ' ')
  const answers = { ...EMPTY_ANSWERS }
  places.forEach((place, i) => {
    answers[place] = aligned[i].trim()
  })
  return answers
}
