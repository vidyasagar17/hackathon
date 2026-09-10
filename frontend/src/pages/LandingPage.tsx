import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

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
    <svg viewBox="0 0 96 72" className="h-16 w-20 opacity-40">
      <rect x="18" y="34" width="60" height="6" rx="3" fill="#1B1B2F" />
      <circle cx="48" cy="18" r="6" fill="#1B1B2F" />
      <circle cx="48" cy="54" r="6" fill="#1B1B2F" />
    </svg>
  )
}

type GameCardProps = {
  icon: ReactNode
  title: string
  description: string
  to?: string
}

function GameCard({ icon, title, description, to }: GameCardProps) {
  const content = (
    <div
      className={`flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center shadow-[0_8px_0_rgba(0,0,0,0.1)] ${
        to ? 'active:translate-y-1 active:shadow-none' : 'opacity-60'
      }`}
    >
      {icon}
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p className="text-sm">{description}</p>
      {!to && (
        <span className="rounded-full bg-ink/10 px-3 py-1 font-display text-xs font-semibold text-ink/60">
          Coming soon
        </span>
      )}
    </div>
  )

  return to ? (
    <Link to={to} className="block">
      {content}
    </Link>
  ) : (
    content
  )
}

function GameGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="w-full max-w-3xl">
      <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-base">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-2xl font-bold">Number Quest</span>
        <Link to="/summary" className="font-display font-semibold text-ink/70">
          Session summary
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center gap-10 px-4 py-8">
        <h1 className="text-center font-display text-4xl font-bold">
          What do you want to practice?
        </h1>

        <GameGroup title="Adding & Taking Away">
          <GameCard
            icon={<SubtractionIcon />}
            title="Subtraction"
            description="Multi-digit subtraction with borrowing"
            to="/practice/subtraction"
          />
          <GameCard
            icon={<AdditionIcon />}
            title="Addition"
            description="Multi-digit addition with carrying"
            to="/practice/addition"
          />
        </GameGroup>

        <GameGroup title="Grouping & Sharing">
          <GameCard
            icon={<MultiplicationIcon />}
            title="Multiplication"
            description="Times tables and multi-digit products"
            to="/practice/multiplication"
          />
          <GameCard
            icon={<DivisionIcon />}
            title="Division"
            description="Splitting numbers into equal groups"
          />
        </GameGroup>
      </main>
    </div>
  )
}

export default LandingPage
