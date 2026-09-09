export type Column = 'hundreds' | 'tens' | 'ones'

export const chipColor: Record<Column, string> = {
  hundreds: 'bg-hundreds',
  tens: 'bg-tens',
  ones: 'bg-ones',
}

export const borderColor: Record<Column, string> = {
  hundreds: 'border-hundreds',
  tens: 'border-tens',
  ones: 'border-ones',
}
