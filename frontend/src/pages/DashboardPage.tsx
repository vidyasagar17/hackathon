import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../api'
import AppHeader from '../components/AppHeader'
import MuteToggle from '../components/MuteToggle'
import { formatGameName, formatMisconception } from '../format'
import { getSessionId } from '../session'

type MisconceptionCount = {
  game: string
  name: string
  count: number
}

type GameScore = {
  game: string
  total_attempts: number
  correct_count: number
}

type SessionSummary = {
  total_attempts: number
  correct_count: number
  misconceptions: MisconceptionCount[]
  games: GameScore[]
}

/** A card can list this many mistakes; the most frequent come first. */
const TOP_MISTAKES = 3

const NOTE = 'rounded-2xl border-2 border-felt-edge bg-card shadow-[0_6px_0_#163A34]'

/** The big dark link's look; each tag still writes `tap-target` so `check:tap-targets` can see it. */
const BIG_LINK =
  'inline-flex items-center rounded-2xl bg-ink px-8 py-4 font-display text-xl font-semibold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

const sentenceCase = (words: string) => words.charAt(0).toUpperCase() + words.slice(1)

/** Right out of total as a filled bar; the words beside it carry the numbers. */
function ScoreBar({ right, total }: { right: number; total: number }) {
  return (
    <div aria-hidden="true" className="h-3 w-full overflow-hidden rounded-full bg-ink/10">
      <div className="h-full rounded-full bg-felt" style={{ width: `${(100 * right) / total}%` }} />
    </div>
  )
}

/** One game's card: a felt title band, its own score, and its most frequent mistakes in words. */
function GameCard({ score, mistakes }: { score: GameScore; mistakes: MisconceptionCount[] }) {
  const id = `game-${score.game}`
  const top = [...mistakes].sort((a, b) => b.count - a.count).slice(0, TOP_MISTAKES)

  return (
    <section aria-labelledby={id} className={`flex flex-col overflow-hidden ${NOTE}`}>
      <h2 id={id} className="bg-felt px-4 py-2 font-display text-xl font-bold text-chalk">
        {formatGameName(score.game)}
      </h2>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="font-display text-3xl font-bold">{`${score.correct_count} of ${score.total_attempts} right`}</p>
        <ScoreBar right={score.correct_count} total={score.total_attempts} />
        {top.length === 0 ? (
          <p className="text-lg">No mistakes in this game.</p>
        ) : (
          <>
            <h3 className="font-display text-lg font-semibold text-ink-muted">Mistakes to work on</h3>
            <ul className="flex flex-col divide-y divide-ink/10">
              {top.map((mistake) => (
                <li key={mistake.name} className="flex items-center gap-3 py-2">
                  <span className="h-3 w-3 flex-shrink-0 rounded-full bg-helper" />
                  <span className="flex-1 text-lg">{sentenceCase(formatMisconception(mistake.name))}</span>
                  <span className="font-display font-semibold text-ink-muted">
                    {mistake.count} {mistake.count === 1 ? 'time' : 'times'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function SummaryBody({ summary }: { summary: SessionSummary }) {
  if (summary.total_attempts === 0) {
    return (
      <div className={`flex w-full max-w-md flex-col items-center gap-4 p-8 text-center ${NOTE}`}>
        <p className="font-display text-3xl font-bold">Nothing played yet</p>
        <p className="text-xl">Play any game and your results show up here.</p>
        <Link to="/" className={`tap-target ${BIG_LINK}`}>
          Pick a game
        </Link>
      </div>
    )
  }

  const games = [...summary.games].sort((a, b) => b.total_attempts - a.total_attempts)

  return (
    <>
      <div role="group" aria-label="Whole session" className={`w-full max-w-md p-6 text-center ${NOTE}`}>
        <p className="font-display text-5xl font-bold">{`${summary.correct_count} of ${summary.total_attempts}`}</p>
        <p className="mt-1 text-xl">answers right this session</p>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {games.map((score) => (
          <GameCard
            key={score.game}
            score={score}
            mistakes={summary.misconceptions.filter((mistake) => mistake.game === score.game)}
          />
        ))}
      </div>

      <Link to="/" className={`tap-target ${BIG_LINK}`}>
        Practice again
      </Link>
    </>
  )
}

/**
 * The session summary: the whole session's score, then one card per game played (most played first) with its
 * own score and top mistakes as the diagnosis named them. A session with nothing played gets a friendly start.
 */
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
          <>
            <MuteToggle />
            <Link
              to="/"
              className="tap-target inline-flex items-center rounded-2xl px-2 font-display font-semibold text-ink-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2"
            >
              Back to games
            </Link>
          </>
        }
      />

      <main className="flex flex-1 flex-col items-center gap-6 px-4 py-8">
        <h1 className="font-display text-4xl font-bold">Session summary</h1>

        {failed ? (
          <p className="font-display text-2xl font-bold text-alert-text">Couldn't load your summary — try again in a moment.</p>
        ) : !summary ? (
          <p className="font-display text-xl">Loading summary...</p>
        ) : (
          <SummaryBody summary={summary} />
        )}
      </main>
    </div>
  )
}

export default DashboardPage
