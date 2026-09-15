export type Column = 'thousands' | 'hundreds' | 'tens' | 'ones'

export const chipColor: Record<Column, string> = {
  thousands: 'bg-ink/20',
  hundreds: 'bg-hundreds',
  tens: 'bg-tens',
  ones: 'bg-ones',
}

/** Light tint of each place color for answer boxes. Their outline is ink, so the edge passes 3:1. */
export const answerFill: Record<Column, string> = {
  thousands: 'bg-ink/10',
  hundreds: 'bg-hundreds/25',
  tens: 'bg-tens/25',
  ones: 'bg-ones/25',
}

/** Letter shown on each chip so place isn't conveyed by color alone. */
export const placeLetter: Record<Column, string> = {
  thousands: 'Th',
  hundreds: 'H',
  tens: 'T',
  ones: 'O',
}
