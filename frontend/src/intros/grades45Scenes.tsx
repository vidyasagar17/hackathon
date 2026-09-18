import type { ReactNode } from 'react'
import CubeBox from '../components/CubeBox'
import FractionCard from '../components/FractionCard'
import PlayingCard from '../components/PlayingCard'
import { Arrive, Badge, Chalk, NumberTile, Reveal, Seat, type SceneProps } from './parts'

/** A decimal as Decimal War deals it: "0." then one card per digit. */
export function Decimal({ digits }: { digits: number[] }) {
  return (
    <span className="flex items-center gap-1">
      <Chalk size="text-5xl">0.</Chalk>
      {digits.map((digit, index) => (
        <PlayingCard key={index} digit={digit} />
      ))}
    </span>
  )
}

export function DecimalWarScene({ step }: SceneProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="flex items-center gap-2">
        <Seat name="Robo" />
        <Decimal digits={[4, 5]} />
      </div>
      <div className="flex items-center gap-2">
        <Seat name="You" />
        <Arrive at={1} step={step} from="below">
          <span className={`flex rounded-xl ${step >= 3 ? 'ring-4 ring-hundreds ring-offset-4 ring-offset-felt' : ''}`}>
            <Decimal digits={[8]} />
          </span>
        </Arrive>
        <Arrive at={2} step={step} from="right">
          <span className="flex h-24 w-16 items-center justify-center rounded-lg border-2 border-dashed border-chalk font-display text-5xl font-bold text-chalk">
            0
          </span>
        </Arrive>
      </div>
      <Arrive at={3} step={step} className="self-center">
        <Badge>0.8 is larger!</Badge>
      </Arrive>
    </div>
  )
}

/** A plain spoon: what a won hand of Fraction Spoons earns. */
export function Spoon() {
  return (
    <svg viewBox="0 0 40 90" aria-hidden="true" className="h-24 w-12">
      <ellipse cx="20" cy="18" rx="14" ry="17" strokeWidth="3" className="fill-chalk stroke-felt-edge" />
      <rect x="16" y="32" width="8" height="54" rx="4" strokeWidth="3" className="fill-chalk stroke-felt-edge" />
    </svg>
  )
}

export function FractionSpoonsScene({ step }: SceneProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <Chalk size="text-xl">Collecting</Chalk>
        <span className="rounded-xl ring-4 ring-hundreds ring-offset-2 ring-offset-felt">
          <FractionCard top={1} bottom={2} />
        </span>
      </div>
      <div className="flex flex-wrap items-end justify-center gap-4">
        <div className="flex items-end gap-2">
          <FractionCard top={2} bottom={4} />
          <FractionCard top={3} bottom={6} />
          <span className={step >= 3 ? 'invisible' : ''}>
            <FractionCard top={2} bottom={3} />
          </span>
          <div className="flex flex-col items-center gap-1">
            <Arrive at={2} step={step}>
              <Badge>Fits!</Badge>
            </Arrive>
            <Arrive at={1} step={step} from="right">
              <FractionCard top={4} bottom={8} />
            </Arrive>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Chalk size="text-base">Discard</Chalk>
          <span className="relative block h-24 w-16 rounded-lg border-2 border-dashed border-chalk/60">
            <Arrive at={3} step={step} from="left" className="absolute inset-0">
              <FractionCard top={2} bottom={3} />
            </Arrive>
          </span>
        </div>
        <Arrive at={4} step={step}>
          <Spoon />
        </Arrive>
      </div>
    </div>
  )
}

export function TwentyFourScene({ step }: SceneProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2">
        {[3, 5, 3, 1].map((card, index) => (
          <PlayingCard key={index} digit={card} />
        ))}
      </div>
      <Arrive at={1} step={step} from="left">
        <Chalk size="text-2xl">3 + 5 = 8</Chalk>
      </Arrive>
      <Arrive at={2} step={step} from="left">
        <Chalk size="text-2xl">8 × 3 = 24</Chalk>
      </Arrive>
      <Arrive at={3} step={step}>
        <Badge>(3 + 5) × 3 × 1 = 24</Badge>
      </Arrive>
      <Arrive at={4} step={step} from="left">
        <Chalk size="text-xl">Without ( ): 3 + 5 × 3 × 1 = 18</Chalk>
      </Arrive>
    </div>
  )
}

const GRID = 4
const UNIT = 40
const ORIGIN = { x: 30, y: 180 }
const at = (x: number, y: number) => ({ x: ORIGIN.x + x * UNIT, y: ORIGIN.y - y * UNIT })

/** A layer drawn over the grid, in the grid's own coordinates. */
export function GridLayer({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 210 210" aria-hidden="true" className="absolute inset-0 h-full w-full">
      {children}
    </svg>
  )
}

/** A first-quadrant grid 0–4, as Battleship's ocean draws it. */
export function Grid({ children }: { children?: ReactNode }) {
  const lines = Array.from({ length: GRID + 1 }, (_, index) => index)
  return (
    <div className="relative h-52 w-52">
      <svg viewBox="0 0 210 210" aria-hidden="true" className="h-full w-full">
        <rect x={ORIGIN.x} y={ORIGIN.y - GRID * UNIT} width={GRID * UNIT} height={GRID * UNIT} className="fill-tens/30" />
        {lines.map((line) => (
          <g key={line}>
            <line x1={at(line, 0).x} x2={at(line, GRID).x} y1={at(line, 0).y} y2={at(line, GRID).y} strokeWidth={line === 0 ? 3 : 1} className="stroke-chalk" />
            <line x1={at(0, line).x} x2={at(GRID, line).x} y1={at(0, line).y} y2={at(GRID, line).y} strokeWidth={line === 0 ? 3 : 1} className="stroke-chalk" />
            <text x={at(line, 0).x} y={ORIGIN.y + 20} textAnchor="middle" fontSize="14" fontWeight="700" className="fill-chalk font-display">
              {line}
            </text>
            <text x={ORIGIN.x - 14} y={at(0, line).y + 5} textAnchor="middle" fontSize="14" fontWeight="700" className="fill-chalk font-display">
              {line}
            </text>
          </g>
        ))}
      </svg>
      {children}
    </div>
  )
}

export function Point({ x, y }: { x: number; y: number }) {
  return <circle cx={at(x, y).x} cy={at(x, y).y} r="9" strokeWidth="3" className="fill-hundreds stroke-felt-edge" />
}

export function BattleshipScene({ step }: SceneProps) {
  const aim = at(3, 2)
  const corner = at(3, 0)
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <Grid>
        <Reveal at={2} step={step} className="absolute inset-0">
          <GridLayer>
            <path d={`M ${ORIGIN.x} ${ORIGIN.y} H ${corner.x} V ${aim.y}`} fill="none" strokeWidth="4" strokeDasharray="8 5" className="stroke-hundreds" />
          </GridLayer>
        </Reveal>
        <Arrive at={1} step={step} className="absolute inset-0">
          <GridLayer>
            <Point x={3} y={2} />
          </GridLayer>
        </Arrive>
        <Arrive at={3} step={step} className="absolute inset-0">
          <GridLayer>
            <circle cx={aim.x} cy={aim.y} r="16" strokeWidth="5" className="fill-ones stroke-felt-edge" />
          </GridLayer>
        </Arrive>
      </Grid>
      <div className="flex flex-col items-center gap-3">
        <Arrive at={2} step={step} from="left">
          <NumberTile className="px-4 text-3xl">(3, 2)</NumberTile>
        </Arrive>
        <Reveal at={3} step={step}>
          <Badge>Hit!</Badge>
        </Reveal>
        <Arrive at={4} step={step} from="right">
          <Chalk size="text-2xl">Robo calls (1, 3)</Chalk>
        </Arrive>
      </div>
    </div>
  )
}

export function VolumeBuilderScene({ step }: SceneProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <CubeBox box={[3, 2, 2]} shaded={step >= 1 ? 'top' : undefined} maxWidth={200} maxHeight={150} />
        <Arrive at={2} step={step} from="below">
          <Chalk size="text-2xl">2 layers × 6 = 12 cubes</Chalk>
        </Arrive>
      </div>
      <Arrive at={3} step={step} from="right" className="flex flex-col items-center gap-2">
        <CubeBox box={[6, 2, 1]} maxWidth={200} maxHeight={120} />
        <Chalk size="text-xl">6 × 2 × 1 = 12 too!</Chalk>
      </Arrive>
    </div>
  )
}
