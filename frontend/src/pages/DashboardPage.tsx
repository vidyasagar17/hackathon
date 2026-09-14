import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../api'
import AppHeader from '../components/AppHeader'
import { formatGameName, formatMisconception } from '../format'
import { getSessionId } from '../session'

type MisconceptionCount = {
  game: string
  name: string
  count: number
}

type SessionSummary = {
  total_attempts: number
  correct_count: number
  misconceptions: MisconceptionCount[]
}

function groupByGame(rows: MisconceptionCount[]): [string, MisconceptionCount[]][] {
  const groups = new Map<string, MisconceptionCount[]>()
  for (const row of rows) {
    groups.set(row.game, [...(groups.get(row.game) ?? []), row])
  }
  return [...groups]
}

function MisconceptionItem({ name, count }: MisconceptionCount) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="h-4 w-4 flex-shrink-0 rounded-full bg-helper" />
      <p className="flex-1 text-left">{formatMisconception(name)}</p>
      <span className="font-display font-semibold text-ink-muted">
        {count} {count === 1 ? 'time' : 'times'}
      </span>
    </div>
  )
}

function DashboardPage() {
  const [summary, setSummary] = useState<SessionSummary | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/summary/${getSessionId()}`)
      .then((res) => {
        if (!res.ok) throw new Error('Summary request failed')
        return res.json()
      })
      .then(setSummary)
      .catch(() => setFailed(true))
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <AppHeader
        left={<span className="font-display text-2xl font-bold">Number Quest</span>}
        right={
          <Link to="/" className="font-display font-semibold text-ink-muted">
            Back to games
          </Link>
        }
      />

      <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
        <h1 className="font-display text-4xl font-bold">Session summary</h1>

        {failed ? (
          <p className="font-display text-xl text-alert-text">
            Couldn't load your summary — try again in a moment.
          </p>
        ) : !summary ? (
          <p className="font-display text-xl">Loading summary...</p>
        ) : (
          <>
            <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_8px_0_rgba(0,0,0,0.1)]">
              <p className="font-display text-5xl font-bold">
                {summary.correct_count} / {summary.total_attempts}
              </p>
              <p className="mt-1 text-lg">answers correct</p>
            </div>

            <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_8px_0_rgba(0,0,0,0.1)]">
              <h2 className="mb-2 font-display text-2xl font-bold">
                Where mistakes happened
              </h2>
              {summary.misconceptions.length === 0 ? (
                <p className="py-3 text-ink-muted">
                  No mistakes yet — keep practicing!
                </p>
              ) : (
                <div className="flex flex-col gap-4">
                  {groupByGame(summary.misconceptions).map(([game, rows]) => (
                    <section key={game}>
                      <h3 className="font-display text-lg font-semibold">
                        {formatGameName(game)}
                      </h3>
                      <div className="divide-y divide-ink/10">
                        {rows.map((row) => (
                          <MisconceptionItem key={row.name} {...row} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <Link
          to="/"
          className="rounded-2xl bg-ink px-8 py-4 font-display text-xl font-semibold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none"
        >
          Practice again
        </Link>
      </main>
    </div>
  )
}

export default DashboardPage
