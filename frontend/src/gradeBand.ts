export type GradeBand = 'k-1' | '2-3' | '4-5'

const GRADE_BAND_KEY = 'grade_band'

/** Grade bands youngest first. */
export const GRADE_BANDS: GradeBand[] = ['k-1', '2-3', '4-5']

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  'k-1': 'Kindergarten & 1st grade',
  '2-3': '2nd & 3rd grade',
  '4-5': '4th & 5th grade',
}

/** The grade band this browser picked, or null before the first pick (or if the saved value is unknown). */
export function getGradeBand(): GradeBand | null {
  const saved = localStorage.getItem(GRADE_BAND_KEY)
  return GRADE_BANDS.find((band) => band === saved) ?? null
}

export function saveGradeBand(band: GradeBand): void {
  localStorage.setItem(GRADE_BAND_KEY, band)
}
