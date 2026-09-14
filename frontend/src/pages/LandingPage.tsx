import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader'
import GradePicker from '../components/GradePicker'
import MuteToggle from '../components/MuteToggle'
import { getGradeBand, saveGradeBand, type GradeBand } from '../gradeBand'

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

type Game = {
  title: string
  description: string
  to: string
  icon: ReactNode
  grades: [number, number]
}

const GAMES: Game[] = [
  {
    title: 'Subtraction',
    description: 'Multi-digit subtraction with borrowing',
    to: '/practice/subtraction',
    icon: <SubtractionIcon />,
    grades: [2, 3],
  },
  {
    title: 'Addition',
    description: 'Multi-digit addition with carrying',
    to: '/practice/addition',
    icon: <AdditionIcon />,
    grades: [2, 3],
  },
  {
    title: 'Multiplication',
    description: 'Times tables and multi-digit products',
    to: '/practice/multiplication',
    icon: <MultiplicationIcon />,
    grades: [3, 5],
  },
  {
    title: 'Division',
    description: 'Splitting numbers into equal groups',
    to: '/practice/division',
    icon: <DivisionIcon />,
    grades: [3, 5],
  },
]

const BAND_GRADES: Record<GradeBand, [number, number]> = {
  'k-1': [0, 1],
  '2-3': [2, 3],
  '4-5': [4, 5],
}

/** A game fits a band when its grade range overlaps the band's grades (kindergarten is grade 0). */
function fitsBand(game: Game, band: GradeBand): boolean {
  const [lowest, highest] = BAND_GRADES[band]
  return game.grades[0] <= highest && game.grades[1] >= lowest
}

function GameCard({ game }: { game: Game }) {
  return (
    <Link to={game.to} className="block">
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-[0_8px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none">
        {game.icon}
        <h3 className="font-display text-xl font-bold">{game.title}</h3>
        <p className="text-sm">{game.description}</p>
      </div>
    </Link>
  )
}

function GameGroup({ title, games }: { title: string; games: Game[] }) {
  return (
    <section className="w-full max-w-3xl">
      <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {games.map((game) => (
          <GameCard key={game.to} game={game} />
        ))}
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

  const yourGames = GAMES.filter((game) => fitsBand(game, band))
  const moreGames = GAMES.filter((game) => !fitsBand(game, band))

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
              className="min-h-12 rounded-2xl border-4 border-ink bg-white px-4 font-display font-semibold text-ink"
            >
              Change grade
            </button>
            <Link to="/summary" className="font-display font-semibold text-ink-muted">
              Session summary
            </Link>
          </>
        }
      />

      <main className="flex flex-1 flex-col items-center gap-10 px-4 py-8">
        <h1 className="text-center font-display text-4xl font-bold">
          What do you want to practice?
        </h1>

        {yourGames.length > 0 ? (
          <GameGroup title="Your grade" games={yourGames} />
        ) : (
          <p className="max-w-md text-center text-lg">
            Games for kindergarten and 1st grade are on the way. Until then, try any game below.
          </p>
        )}

        {moreGames.length > 0 && <GameGroup title="More practice" games={moreGames} />}
      </main>
    </div>
  )
}

export default LandingPage
