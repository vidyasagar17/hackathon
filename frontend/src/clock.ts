/** A clock as the server sends it: the hour hand in minutes past 12 o'clock (0–719) and the minute hand in minutes. */
export type Clock = [number, number]

/** Hand angles in degrees from 12: the hour hand moves half a degree a minute, the minute hand six degrees. */
export function handAngles([hourMinutes, minute]: Clock) {
  return { hour: hourMinutes / 2, minute: minute * 6 }
}
