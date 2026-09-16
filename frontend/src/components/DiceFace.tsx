/** Pip positions on a 3×3 grid (column, row) for each face, as printed on real dice. */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
}

/** A die showing `value` dots on card stock, for counting. Static: nothing animates. */
export default function DiceFace({ value, size = 'large' }: { value: number; size?: 'large' | 'small' }) {
  return (
    <svg
      role="img"
      aria-label={`${value} ${value === 1 ? 'dot' : 'dots'}`}
      viewBox="0 0 60 60"
      className={size === 'large' ? 'h-20 w-20' : 'h-12 w-12'}
    >
      <rect x="2" y="2" width="56" height="56" rx="10" strokeWidth="3" className="fill-card stroke-felt-edge" />
      {PIPS[value].map(([column, row]) => (
        <circle key={`${column}-${row}`} data-pip cx={14 + column * 16} cy={14 + row * 16} r="5.5" className="fill-ink" />
      ))}
    </svg>
  )
}
