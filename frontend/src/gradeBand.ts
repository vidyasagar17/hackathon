export type GradeBand = 'k-1' | '2-3' | '4-5'

const GRADE_BAND_KEY = 'grade_band'

/** Grade bands youngest first. */
export const GRADE_BANDS: GradeBand[] = ['k-1', '2-3', '4-5']

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  'k-1': 'Kindergarten & 1st grade',
  '2-3': '2nd & 3rd grade',
  '4-5': '4th & 5th grade',
}

/** The youngest and oldest age the age question offers. */
export const AGES = [4, 5, 6, 7, 8, 9, 10, 11] as const

/**
 * The band a child of this age is usually in: K and 1st at 5-6, 2nd and 3rd at 7-8,
 * 4th and 5th at 9-10.
 *
 * Ages either side of K-5 are pulled to the nearest band rather than refused, so a young
 * 4-year-old or an older 11-year-old still gets a shelf. Age only sets the starting band
 * -- a student held back or moved up changes it with "Change grade", and that choice wins.
 */
export function bandForAge(age: number): GradeBand {
  if (age <= 6) return 'k-1'
  if (age <= 8) return '2-3'
  return '4-5'
}

/** The grade band this browser picked, or null before the first pick (or if the saved value is unknown). */
export function getGradeBand(): GradeBand | null {
  const saved = localStorage.getItem(GRADE_BAND_KEY)
  return GRADE_BANDS.find((band) => band === saved) ?? null
}

export function saveGradeBand(band: GradeBand): void {
  localStorage.setItem(GRADE_BAND_KEY, band)
}
