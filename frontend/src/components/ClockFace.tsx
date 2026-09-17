import { handAngles, type Clock } from '../clock'

const NUMERALS = Array.from({ length: 12 }, (_, index) => index + 1)
const TICKS = Array.from({ length: 60 }, (_, index) => index)

/**
 * An analog clock drawn from exact hand angles: numerals 1–12, a tick for every minute (longer every five), a short
 * thick hour hand and a long thin minute hand. `label` names it for screen readers; the page decides whether that
 * gives the time away. Static: nothing animates.
 */
export default function ClockFace({ clock, label, size = 'large' }: { clock: Clock; label: string; size?: 'large' | 'small' }) {
  const angles = handAngles(clock)
  return (
    <svg role="img" aria-label={label} viewBox="0 0 100 100" className={size === 'large' ? 'h-60 w-60' : 'h-28 w-28'}>
      <circle cx="50" cy="50" r="47" strokeWidth="3" className="fill-card stroke-felt-edge" />
      {TICKS.map((tick) => (
        <line
          key={tick}
          data-tick
          x1="50"
          y1={tick % 5 === 0 ? 7 : 5}
          x2="50"
          y2="4"
          strokeWidth={tick % 5 === 0 ? 1.6 : 0.7}
          transform={`rotate(${tick * 6} 50 50)`}
          className="stroke-ink"
        />
      ))}
      {NUMERALS.map((numeral) => {
        const angle = (numeral * 30 * Math.PI) / 180
        return (
          <text
            key={numeral}
            data-numeral
            x={50 + 36 * Math.sin(angle)}
            y={50 - 36 * Math.cos(angle) + 4}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            className="fill-ink font-display"
          >
            {numeral}
          </text>
        )
      })}
      <line data-hand="hour" x1="50" y1="50" x2="50" y2="27" strokeWidth="5" strokeLinecap="round" transform={`rotate(${angles.hour} 50 50)`} className="stroke-ink" />
      <line data-hand="minute" x1="50" y1="50" x2="50" y2="12" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${angles.minute} 50 50)`} className="stroke-ink" />
      <circle cx="50" cy="50" r="3" className="fill-ink" />
    </svg>
  )
}
