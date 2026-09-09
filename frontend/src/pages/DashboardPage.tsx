import { Link } from 'react-router-dom'
import { chipColor, type Column } from '../columns'

type MisconceptionRow = {
  column: Column
  description: string
  count: number
}

const misconceptions: MisconceptionRow[] = [
  {
    column: 'tens',
    description: 'Borrowed, but forgot to reduce the tens column',
    count: 3,
  },
  {
    column: 'ones',
    description: 'Subtracted the smaller digit from the larger one',
    count: 2,
  },
]

function MisconceptionItem({ column, description, count }: MisconceptionRow) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className={`h-4 w-4 flex-shrink-0 rounded-full ${chipColor[column]}`} />
      <p className="flex-1 text-left">{description}</p>
      <span className="font-display font-semibold text-ink/60">
        {count} {count === 1 ? 'time' : 'times'}
      </span>
    </div>
  )
}

function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col bg-base">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="font-display text-2xl font-bold">Number Quest</span>
        <Link to="/practice" className="font-display font-semibold text-ink/70">
          Back to practice
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
        <h1 className="font-display text-4xl font-bold">Session summary</h1>

        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_8px_0_rgba(0,0,0,0.1)]">
          <p className="font-display text-5xl font-bold">8 / 12</p>
          <p className="mt-1 text-lg">problems correct</p>
        </div>

        <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_8px_0_rgba(0,0,0,0.1)]">
          <h2 className="mb-2 font-display text-2xl font-bold">
            Where mistakes happened
          </h2>
          <div className="divide-y divide-ink/10">
            {misconceptions.map((row) => (
              <MisconceptionItem key={row.description} {...row} />
            ))}
          </div>
        </div>

        <Link
          to="/practice"
          className="rounded-2xl bg-ink px-8 py-4 font-display text-xl font-semibold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none"
        >
          Practice again
        </Link>
      </main>
    </div>
  )
}

export default DashboardPage
