import { chipColor, type Column } from '../columns'

export default function DigitChip({
  digit,
  column,
  highlighted,
  size = 'md',
}: {
  digit: number
  column: Column
  highlighted?: boolean
  size?: 'md' | 'sm'
}) {
  const dimensions = size === 'sm' ? 'h-14 w-14 text-2xl' : 'h-16 w-16 text-3xl'
  return (
    <div
      className={`flex ${dimensions} items-center justify-center rounded-2xl font-display font-bold text-ink shadow-[0_4px_0_rgba(0,0,0,0.15)] transition-shadow duration-300 ${chipColor[column]} ${highlighted ? 'ring-4 ring-helper ring-offset-2 ring-offset-base' : ''}`}
    >
      {digit}
    </div>
  )
}
