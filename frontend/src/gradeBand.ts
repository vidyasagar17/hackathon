export type GradeBand = 'k-1' | '2-3' | '4-5'

const GRADE_BAND_KEY = 'grade_band'
const GRADE_BANDS: GradeBand[] = ['k-1', '2-3', '4-5']

/** The grade band this browser picked, or null before the first pick (or if the saved value is unknown). */
export function getGradeBand(): GradeBand | null {
  const saved = localStorage.getItem(GRADE_BAND_KEY)
  return GRADE_BANDS.find((band) => band === saved) ?? null
}

export function saveGradeBand(band: GradeBand): void {
  localStorage.setItem(GRADE_BAND_KEY, band)
}
