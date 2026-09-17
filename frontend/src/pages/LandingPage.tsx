import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import GradePicker from '../components/GradePicker'
import MuteToggle from '../components/MuteToggle'
import {
  getGradeBand,
  GRADE_BAND_LABELS,
  GRADE_BANDS,
  saveGradeBand,
  type GradeBand,
} from '../gradeBand'

function SubtractionIcon() {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      <line x1="6" y1="60" x2="90" y2="60" stroke="#1B1B2F" strokeOpacity="0.15" strokeWidth="2" />
      <rect x="12" y="40" width="24" height="20" rx="6" className="fill-hundreds" />
      <rect x="42" y="34" width="24" height="26" rx="6" className="fill-tens" />
      <g transform="rotate(-10 78 22)">
        <rect x="64" y="10" width="24" height="20" rx="6" className="fill-ones" />
      </g>
      <circle cx="84" cy="8" r="9" fill="#1B1B2F" />
      <rect x="79.5" y="6.5" width="9" height="3" rx="1.5" fill="#F3E8D4" />
    </svg>
  )
}

function AdditionIcon() {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      <rect x="8" y="14" width="22" height="18" rx="6" className="fill-ones" />
      <rect x="8" y="38" width="22" height="18" rx="6" className="fill-ones" />
      <rect x="66" y="14" width="22" height="18" rx="6" className="fill-tens" />
      <rect x="66" y="38" width="22" height="18" rx="6" className="fill-tens" />
      <circle cx="48" cy="36" r="14" fill="#1B1B2F" />
      <rect x="42" y="34.5" width="12" height="3" rx="1.5" fill="#F3E8D4" />
      <rect x="46.5" y="30" width="3" height="12" rx="1.5" fill="#F3E8D4" />
    </svg>
  )
}

function MultiplicationIcon() {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      {[0, 1, 2].map((col) =>
        [0, 1].map((row) => (
          <rect
            key={`${col}-${row}`}
            x={14 + col * 26}
            y={16 + row * 26}
            width="18"
            height="18"
            rx="5"
            className={row === 0 ? 'fill-hundreds' : 'fill-tens'}
          />
        )),
      )}
    </svg>
  )
}

function DivisionIcon() {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      <rect x="18" y="34" width="60" height="6" rx="3" className="fill-ones" />
      <circle cx="48" cy="18" r="6" className="fill-tens" />
      <circle cx="48" cy="54" r="6" className="fill-tens" />
    </svg>
  )
}

function DecimalWarIcon() {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      <text x="18" y="54" textAnchor="middle" fontSize="28" fontWeight="700" className="fill-ink font-display">
        0.
      </text>
      <rect x="34" y="12" width="26" height="46" rx="5" strokeWidth="2.5" className="fill-white stroke-felt-edge" />
      <rect x="66" y="12" width="26" height="46" rx="5" strokeWidth="2.5" className="fill-white stroke-felt-edge" />
      <text x="47" y="43" textAnchor="middle" fontSize="24" fontWeight="700" className="fill-ink font-display">
        4
      </text>
      <text x="79" y="43" textAnchor="middle" fontSize="24" fontWeight="700" className="fill-ink font-display">
        5
      </text>
    </svg>
  )
}

/** 73 − 58 on digit cards: the two numbers a For Keeps hand builds. */
function ForKeepsIcon() {
  const cards = [
    { x: 46, y: 4, digit: 7 },
    { x: 70, y: 4, digit: 3 },
    { x: 46, y: 38, digit: 5 },
    { x: 70, y: 38, digit: 8 },
  ]
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      {cards.map(({ x, y, digit }) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="22" height="30" rx="4" strokeWidth="2.5" className="fill-white stroke-felt-edge" />
          <text x={x + 11} y={y + 22} textAnchor="middle" fontSize="18" fontWeight="700" className="fill-ink font-display">
            {digit}
          </text>
        </g>
      ))}
      <rect x="24" y="51" width="14" height="4" rx="2" className="fill-ink" />
    </svg>
  )
}

/**
 * Two digit cards with the operation sign between them: the hand an Addition War or Take-Away War
 * round deals, or a fact Robo calls in Multiplication Shootout.
 */
function TwoCardsIcon({ first, sign, second }: { first: number; sign: string; second: number }) {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      {[
        { x: 6, digit: first },
        { x: 62, digit: second },
      ].map(({ x, digit }) => (
        <g key={x}>
          <rect x={x} y="14" width="28" height="44" rx="5" strokeWidth="2.5" className="fill-white stroke-felt-edge" />
          <text x={x + 14} y="44" textAnchor="middle" fontSize="24" fontWeight="700" className="fill-ink font-display">
            {digit}
          </text>
        </g>
      ))}
      <text x="48" y="45" textAnchor="middle" fontSize="28" fontWeight="700" className="fill-ink font-display">
        {sign}
      </text>
    </svg>
  )
}

/** 1/2 = 2/4 on two fraction cards: a match Fraction Spoons asks the student to spot. */
function FractionSpoonsIcon() {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      {[
        { x: 6, top: 1, bottom: 2 },
        { x: 62, top: 2, bottom: 4 },
      ].map(({ x, top, bottom }) => (
        <g key={x}>
          <rect x={x} y="6" width="28" height="60" rx="5" strokeWidth="2.5" className="fill-white stroke-felt-edge" />
          <text x={x + 14} y="30" textAnchor="middle" fontSize="20" fontWeight="700" className="fill-ink font-display">
            {top}
          </text>
          <rect x={x + 7} y="35" width="14" height="3" rx="1.5" className="fill-ink" />
          <text x={x + 14} y="58" textAnchor="middle" fontSize="20" fontWeight="700" className="fill-ink font-display">
            {bottom}
          </text>
        </g>
      ))}
      <text x="48" y="45" textAnchor="middle" fontSize="28" fontWeight="700" className="fill-ink font-display">
        =
      </text>
    </svg>
  )
}

/** The target 24 on a card over the four signs a 24 Game expression uses. */
function TwentyFourIcon() {
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      <rect x="26" y="4" width="44" height="40" rx="5" strokeWidth="2.5" className="fill-white stroke-felt-edge" />
      <text x="48" y="35" textAnchor="middle" fontSize="26" fontWeight="700" className="fill-ink font-display">
        24
      </text>
      <text x="48" y="66" textAnchor="middle" fontSize="18" fontWeight="700" className="fill-ink font-display">
        + − × ÷
      </text>
    </svg>
  )
}

/** Two dice showing 3 and 5: the roll a Shut the Box turn adds up. */
function ShutTheBoxIcon() {
  const pips = [
    { x: 4, dots: [[15, 22], [26, 36], [37, 50]] },
    { x: 50, dots: [[61, 22], [83, 22], [72, 36], [61, 50], [83, 50]] },
  ]
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      {pips.map(({ x, dots }) => (
        <g key={x}>
          <rect x={x} y="11" width="42" height="50" rx="7" strokeWidth="2.5" className="fill-white stroke-felt-edge" />
          {dots.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" className="fill-ink" />
          ))}
        </g>
      ))}
    </svg>
  )
}

/** 456 + 365 + 163 stacked in place columns over a line: the three numbers a Don't Break the Bank game adds. */
function DontBreakTheBankIcon() {
  const rows = ['456', '365', '163']
  return (
    <svg viewBox="0 0 96 72" className="h-16 w-20">
      {rows.map((row, index) => (
        <text
          key={row}
          x="62"
          y={18 + index * 17}
          textAnchor="middle"
          fontSize="17"
          fontWeight="700"
          letterSpacing="3"
          className="fill-ink font-display"
        >
          {row}
        </text>
      ))}
      <text x="22" y="52" textAnchor="middle" fontSize="20" fontWeight="700" className="fill-ink font-display">
        +
      </text>
      <rect x="30" y="58" width="62" height="3" rx="1.5" className="fill-ink" />
      <text x="62" y="71" textAnchor="middle" fontSize="10" fontWeight="700" className="fill-ink font-display">
        under 1000
      </text>
    </svg>
  )
}

type Game = {
  title: string
  description: string
  to: string
  icon: ReactNode
  /** The one shelf the game sits on: its home band in the curriculum catalog. */
  band: GradeBand
  /** Curriculum games are played against Robo; skill workshops are solo practice. */
  kind: 'robo' | 'workshop'
}

const GAMES: Game[] = [
  {
    title: 'Decimal War',
    description: 'Judge whose decimal is larger',
    to: '/curriculum/decimal-war',
    icon: <DecimalWarIcon />,
    band: '4-5',
    kind: 'robo',
  },
  {
    title: 'Fraction Spoons',
    description: 'Collect four equal fractions to win a spoon',
    to: '/curriculum/fraction-spoons',
    icon: <FractionSpoonsIcon />,
    band: '4-5',
    kind: 'robo',
  },
  {
    title: 'The 24 Game',
    description: 'Use all four cards with + − × ÷ to make 24',
    to: '/curriculum/the-24-game',
    icon: <TwentyFourIcon />,
    band: '4-5',
    kind: 'robo',
  },
  {
    title: 'For Keeps',
    description: 'Build two numbers, subtract, keep the lowest score',
    to: '/curriculum/for-keeps',
    icon: <ForKeepsIcon />,
    band: '2-3',
    kind: 'robo',
  },
  {
    title: 'Multiplication Shootout',
    description: 'Answer times and division facts in turns with Robo',
    to: '/curriculum/multiplication-shootout',
    icon: <TwoCardsIcon first={6} sign="×" second={7} />,
    band: '2-3',
    kind: 'robo',
  },
  {
    title: "Don't Break the Bank",
    description: 'Place rolled digits, add your numbers, and get close to 1000 without going over',
    to: '/curriculum/dont-break-the-bank',
    icon: <DontBreakTheBankIcon />,
    band: '2-3',
    kind: 'robo',
  },
  {
    title: 'Addition War',
    description: 'Add your two cards and see whose hand wins',
    to: '/curriculum/addition-war',
    icon: <TwoCardsIcon first={3} sign="+" second={4} />,
    band: 'k-1',
    kind: 'robo',
  },
  {
    title: 'Take-Away War',
    description: 'Take the smaller card away and see whose hand wins',
    to: '/curriculum/take-away-war',
    icon: <TwoCardsIcon first={8} sign="−" second={3} />,
    band: 'k-1',
    kind: 'robo',
  },
  {
    title: 'Shut the Box',
    description: 'Roll two dice, add the dots, and shut tiles that make that many',
    to: '/curriculum/shut-the-box',
    icon: <ShutTheBoxIcon />,
    band: 'k-1',
    kind: 'robo',
  },
  {
    title: 'Subtraction',
    description: 'Multi-digit subtraction with borrowing',
    to: '/practice/subtraction',
    icon: <SubtractionIcon />,
    band: '2-3',
    kind: 'workshop',
  },
  {
    title: 'Addition',
    description: 'Multi-digit addition with carrying',
    to: '/practice/addition',
    icon: <AdditionIcon />,
    band: '2-3',
    kind: 'workshop',
  },
  {
    title: 'Multiplication',
    description: 'Times tables and multi-digit products',
    to: '/practice/multiplication',
    icon: <MultiplicationIcon />,
    band: '4-5',
    kind: 'workshop',
  },
  {
    title: 'Division',
    description: 'Splitting numbers into equal groups',
    to: '/practice/division',
    icon: <DivisionIcon />,
    band: '4-5',
    kind: 'workshop',
  },
]

/** A game box: a felt lid holding the icon on a card-stock tile, then the title and description. */
function GameBox({ game }: { game: Game }) {
  return (
    <Link
      to={game.to}
      className="tap-target block overflow-hidden rounded-2xl border-2 border-felt-edge bg-card shadow-[0_6px_0_#163A34] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2 active:translate-y-1 active:shadow-[0_2px_0_#163A34]"
    >
      <div className="flex h-24 items-center justify-center bg-felt">
        <span className="rounded-xl bg-card px-2 py-1">{game.icon}</span>
      </div>
      <div className="flex flex-col items-start gap-1 p-4">
        <h3 className="font-display text-xl font-bold text-ink">{game.title}</h3>
        <p className="text-sm text-ink">{game.description}</p>
        {game.kind === 'robo' && (
          <span className="mt-1 rounded-full bg-hundreds px-3 py-0.5 font-display text-sm font-bold text-ink">
            vs Robo
          </span>
        )}
      </div>
    </Link>
  )
}

function GameGroup({ label, games }: { label: string; games: Game[] }) {
  return (
    <div className="flex flex-col gap-3" style={{ flexGrow: games.length, flexBasis: 0 }}>
      <p className="font-display text-lg font-semibold text-ink-muted">{label}</p>
      <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-6">
        {games.map((game) => (
          <GameBox key={game.to} game={game} />
        ))}
      </div>
    </div>
  )
}

/** One grade band's shelf: games against Robo first, then skill workshops. */
function Shelf({ band, isYours }: { band: GradeBand; isYours: boolean }) {
  const id = `shelf-${band}`
  const games = GAMES.filter((game) => game.band === band)
  const roboGames = games.filter((game) => game.kind === 'robo')
  const workshops = games.filter((game) => game.kind === 'workshop')

  return (
    <section aria-labelledby={id} className="w-full max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b-4 border-felt-edge pb-2">
        <h2 id={id} className="font-display text-2xl font-bold">
          {GRADE_BAND_LABELS[band]}
        </h2>
        {isYours && (
          <span className="rounded-full bg-felt px-3 py-1 font-display text-sm font-bold text-chalk">
            Your grade
          </span>
        )}
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        {roboGames.length > 0 && <GameGroup label="Games against Robo" games={roboGames} />}
        {workshops.length > 0 && <GameGroup label="Skill workshops" games={workshops} />}
      </div>
    </section>
  )
}

function LandingPage() {
  const [band, setBand] = useState<GradeBand | null>(getGradeBand)
  const [picking, setPicking] = useState(false)

  const pickBand = (chosen: GradeBand) => {
    saveGradeBand(chosen)
    setBand(chosen)
    setPicking(false)
  }

  if (band === null || picking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4 py-8">
        <GradePicker onPick={pickBand} />
      </div>
    )
  }

  const shelves = [band, ...GRADE_BANDS.filter((other) => other !== band)]

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader
        left={<span className="font-display text-2xl font-bold">Number Quest</span>}
        right={
          <>
            <MuteToggle />
            <button
              type="button"
              onClick={() => setPicking(true)}
              className="tap-target rounded-2xl border-4 border-ink bg-white px-4 font-display font-semibold text-ink"
            >
              Change grade
            </button>
            <Link
              to="/summary"
              className="tap-target inline-flex items-center px-2 font-display font-semibold text-ink-muted"
            >
              Session summary
            </Link>
          </>
        }
      />

      <main className="flex flex-1 flex-col items-center gap-10 px-4 py-8">
        <h1 className="text-center font-display text-4xl font-bold">What do you want to practice?</h1>
        {shelves.map((shelfBand) => (
          <Shelf key={shelfBand} band={shelfBand} isYours={shelfBand === band} />
        ))}
      </main>
    </div>
  )
}

export default LandingPage
