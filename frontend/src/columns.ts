export type Column = 'thousands' | 'hundreds' | 'tens' | 'ones'

export const chipColor: Record<Column, string> = {
  thousands: 'bg-ink/20',
  hundreds: 'bg-hundreds',
  tens: 'bg-tens',
  ones: 'bg-ones',
}

export const borderColor: Record<Column, string> = {
  thousands: 'border-ink/30',
  hundreds: 'border-hundreds',
  tens: 'border-tens',
  ones: 'border-ones',
}
