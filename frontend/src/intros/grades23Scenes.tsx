import DiceFace from '../components/DiceFace'
import PlayingCard from '../components/PlayingCard'
import { Arrive, Badge, Chalk, NumberTile, Seat, type SceneProps } from './parts'

const NUMERALS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

/**
 * A clock whose hands turn to their new angle when the demo steps, so the student watches the minute hand sweep
 * round and then the hour hand creep on. Only one hand's angle changes per step. Under reduced motion the hands
 * jump to their places.
 */
export function DemoClock({ hour, minute, size = 'h-52 w-52' }: { hour: number; minute: number; size?: string }) {
  const hand = (angle: number) => ({
    transform: `rotate(${angle}deg)`,
    transformOrigin: '50px 50px',
    transformBox: 'view-box' as const,
  })
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={size}>
      <circle cx="50" cy="50" r="47" strokeWidth="3" className="fill-card stroke-felt-edge" />
      {NUMERALS.map((numeral, index) => {
        const angle = (index * 30 * Math.PI) / 180
        return (
          <text
            key={numeral}
            x={50 + 36 * Math.sin(angle)}
            y={50 - 36 * Math.cos(angle) + 4.5}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            className="fill-ink font-display"
          >
            {numeral}
          </text>
        )
      })}
      <g style={hand(hour)} className="transition-transform duration-1000 ease-in-out motion-reduce:transition-none">
        <line x1="50" y1="50" x2="50" y2="28" strokeWidth="6" strokeLinecap="round" className="stroke-ink" />
      </g>
      <g style={hand(minute)} className="transition-transform duration-1000 ease-in-out motion-reduce:transition-none">
        <line x1="50" y1="50" x2="50" y2="12" strokeWidth="3" strokeLinecap="round" className="stroke-ink" />
      </g>
      <circle cx="50" cy="50" r="3.5" className="fill-ink" />
    </svg>
  )
}

export function ClockMatchScene({ step }: SceneProps) {
  const minute = step >= 1 ? 180 : 0
  const hour = step >= 2 ? 105 : 90
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <DemoClock hour={hour} minute={minute} />
      <Arrive at={3} step={step} from="right">
        <NumberTile marked className="px-5 text-4xl">
          3:30
        </NumberTile>
      </Arrive>
    </div>
  )
}

export function TargetNumberScene({ step }: SceneProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-4">
        <span
          className={`flex h-20 w-20 items-center justify-center rounded-full border-4 border-felt-edge bg-hundreds font-display text-3xl font-bold text-ink ${
            step >= 3 ? 'ring-4 ring-chalk ring-offset-2 ring-offset-felt' : ''
          }`}
        >
          15
        </span>
        <div className="flex gap-2">
          {[9, 8, 2, 6].map((card) => (
            <NumberTile key={card} marked={card === 9 && step === 0}>
              {card}
            </NumberTile>
          ))}
        </div>
      </div>
      <Arrive at={1} step={step} from="left">
        <Chalk>9 + 8 = 17</Chalk>
      </Arrive>
      <Arrive at={2} step={step} from="left">
        <Chalk>17 − 2 = 15</Chalk>
      </Arrive>
      <Arrive at={3} step={step}>
        <Badge>On target: a point!</Badge>
      </Arrive>
      <Arrive at={4} step={step} from="left">
        <Chalk>15 = 9 + ☐</Chalk>
      </Arrive>
    </div>
  )
}

const BANK_ROWS = ['456', '365', '163']
const PLACES = ['H', 'T', 'O']

export function DontBreakTheBankScene({ step }: SceneProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <Badge>Bank: 1000</Badge>
        <Arrive at={1} step={step}>
          <DiceFace value={4} />
        </Arrive>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-2 pr-0.5">
          {PLACES.map((place) => (
            <span key={place} className="w-12 text-center font-display text-lg font-bold text-chalk">
              {place}
            </span>
          ))}
        </div>
        {BANK_ROWS.map((row, rowIndex) => (
          <div key={row} className="flex items-center gap-2">
            {rowIndex === 2 && <Chalk>+</Chalk>}
            {[...row].map((digit, place) => {
              const first = rowIndex === 0 && place === 0
              return (
                <span key={place} className="relative">
                  <span className="block h-12 w-12 rounded-lg border-2 border-dashed border-chalk/60" />
                  {first ? (
                    <Arrive at={2} step={step} className="absolute inset-0">
                      <NumberTile className="h-12 w-12 min-w-12">{digit}</NumberTile>
                    </Arrive>
                  ) : (
                    <span className={`absolute inset-0 ${step >= 3 ? '' : 'invisible'}`}>
                      <NumberTile className="h-12 w-12 min-w-12">{digit}</NumberTile>
                    </span>
                  )}
                </span>
              )
            })}
          </div>
        ))}
        <div className="h-1 w-full rounded bg-chalk" />
        <Arrive at={4} step={step} from="below">
          <Chalk>984</Chalk>
        </Arrive>
      </div>
    </div>
  )
}

/** 6 rows of 7 dots: what 6 × 7 means. */
export function DotArray({ rows, columns }: { rows: number; columns: number }) {
  return (
    <svg viewBox={`0 0 ${columns * 12} ${rows * 12}`} aria-hidden="true" className="h-24">
      {Array.from({ length: rows * columns }, (_, index) => (
        <circle key={index} cx={6 + (index % columns) * 12} cy={6 + Math.floor(index / columns) * 12} r="4" className="fill-chalk" />
      ))}
    </svg>
  )
}

export function MultiplicationShootoutScene({ step }: SceneProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <Seat name="Robo" />
        <Chalk>calls</Chalk>
        <PlayingCard digit={6} />
        <Chalk>×</Chalk>
        <PlayingCard digit={7} />
      </div>
      <div className="flex items-center gap-4">
        <Arrive at={1} step={step}>
          <DotArray rows={6} columns={7} />
        </Arrive>
        <Arrive at={2} step={step} from="below" className="flex items-center gap-2">
          <Chalk>=</Chalk>
          <NumberTile marked className="px-4 text-3xl">
            42
          </NumberTile>
        </Arrive>
      </div>
      <Arrive at={3} step={step} from="right">
        <Chalk size="text-2xl">Robo answers 4 × 8 = 32</Chalk>
      </Arrive>
      <Arrive at={4} step={step}>
        <Badge>You 1 · Robo 1</Badge>
      </Arrive>
    </div>
  )
}

export function ForKeepsScene({ step }: SceneProps) {
  const used = (digit: number) => (digit === 7 || digit === 3 ? step >= 1 : step >= 2)
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="grid grid-cols-2 gap-2">
        {[7, 3, 5, 8].map((digit) => (
          <span key={digit} className={used(digit) ? 'invisible' : ''}>
            <PlayingCard digit={digit} />
          </span>
        ))}
      </div>
      <div className="flex flex-col items-end gap-2">
        <Arrive at={1} step={step} from="left" className="flex gap-1">
          <PlayingCard digit={7} />
          <PlayingCard digit={3} />
        </Arrive>
        <div className="flex items-center gap-2">
          <Chalk>−</Chalk>
          <Arrive at={2} step={step} from="left" className="flex gap-1">
            <PlayingCard digit={5} />
            <PlayingCard digit={8} />
          </Arrive>
        </div>
        <div className="h-1 w-full rounded bg-chalk" />
        <Arrive at={3} step={step} from="below">
          <Chalk size="text-4xl">15</Chalk>
        </Arrive>
      </div>
      <Arrive at={4} step={step} className="flex flex-col gap-2">
        <NumberTile className="px-4 text-xl">Keep it</NumberTile>
        <NumberTile className="px-4 text-xl">Trash it</NumberTile>
      </Arrive>
    </div>
  )
}
