import type { Column } from './columns'

/**
 * Turn a wrong answer into the column-by-column walk the student can replay beside the
 * correct one.
 *
 * Built from the two answers rather than from the buggy simulators themselves: the server
 * already decided *which* bug this was, and the digits it produced are what the student
 * actually wrote. So the replay never invents reasoning the diagnosis didn't find.
 */

/** Places right to left, which is the order a student works a column problem. */
const WORKING_ORDER: Column[] = ['ones', 'tens', 'hundreds', 'thousands']

export type ReplayStep = {
  place: Column
  topDigit: number
  bottomDigit: number
  /** The digit the student wrote in this place. */
  yours: number
  /** The digit that belongs in this place. */
  right: number
  matches: boolean
}

type ColumnData = { place: Column; [key: string]: unknown }

/** The digit of `value` in `place`, or 0 when the number is too short to reach it. */
export function digitAt(value: number, place: Column): number {
  const power = { ones: 1, tens: 10, hundreds: 100, thousands: 1000 }[place]
  return Math.floor(Math.abs(value) / power) % 10
}

/**
 * One step per place the problem has, in the order the student worked them.
 *
 * `topField` and `bottomField` name the two digit fields on a column, which differ per
 * game (minuend/subtrahend, addend1/addend2).
 */
export function buildReplaySteps(
  columns: ColumnData[],
  topField: string,
  bottomField: string,
  right: number,
  yours: number,
): ReplayStep[] {
  const places = columns.map((column) => column.place)
  return WORKING_ORDER.filter((place) => places.includes(place)).map((place) => {
    const column = columns.find((candidate) => candidate.place === place) as ColumnData
    const yourDigit = digitAt(yours, place)
    const rightDigit = digitAt(right, place)
    return {
      place,
      topDigit: Number(column[topField]),
      bottomDigit: Number(column[bottomField]),
      yours: yourDigit,
      right: rightDigit,
      matches: yourDigit === rightDigit,
    }
  })
}

/**
 * The index of the first step where the two answers part company, or null when every
 * place agrees (which happens when a wrong answer has more digits than the right one).
 */
export function firstDivergence(steps: ReplayStep[]): number | null {
  const index = steps.findIndex((step) => !step.matches)
  return index === -1 ? null : index
}
