/**
 * A card of scattered dots on card stock, for counting (K.CC.B.5). Positions come from the server in a 100 × 100
 * card, so a saved game shows the same card. Static: nothing animates.
 */
export default function DotCard({ dots, size = 'large' }: { dots: [number, number][]; size?: 'large' | 'small' }) {
  return (
    <svg
      role="img"
      aria-label={`${dots.length} ${dots.length === 1 ? 'dot' : 'dots'}`}
      viewBox="0 0 100 100"
      className={size === 'large' ? 'h-28 w-28' : 'h-12 w-12'}
    >
      <rect x="2" y="2" width="96" height="96" rx="12" strokeWidth="4" className="fill-card stroke-felt-edge" />
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} data-dot cx={x} cy={y} r="7" className="fill-ink" />
      ))}
    </svg>
  )
}
