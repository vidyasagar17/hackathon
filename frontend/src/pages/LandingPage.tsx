import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_URL } from '../api'
import AppHeader from '../components/AppHeader'
import GradePicker from '../components/GradePicker'
import MuteToggle from '../components/MuteToggle'
import PlayerToken from '../components/PlayerToken'
import ProfilePicker from '../components/ProfilePicker'
import ReadAloudButton from '../components/ReadAloudButton'
import RoboAvatar from '../components/RoboAvatar'
import RoboBubble from '../components/RoboBubble'
import { GAMES, gameId, type Game } from '../gameCatalog'
import {
  getGradeBand,
  GRADE_BAND_LABELS,
  GRADE_BANDS,
  saveGradeBand,
  type GradeBand,
} from '../gradeBand'
import {
  masteryLabel,
  percentRight,
  suggestionSentence,
  type GameState,
  type Home,
} from '../home'
import {
  getLearnerId,
  getLearnerName,
  getLearnerToken,
  saveLearnerName,
  saveLearnerToken,
  type Token,
} from '../learner'

const QUESTION = 'What do you want to practice?'

const WELCOME = 'Play a game against Robo, or practice one skill at a time.'

/** A thick purple ring for keyboard focus only; a tap never shows it. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

/** Each band's own colour, so a shelf is recognisable before its heading is read. */
const BAND_RAIL: Record<GradeBand, string> = {
  'k-1': 'bg-spark',
  '2-3': 'bg-tens',
  '4-5': 'bg-hundreds',
}

/** How a tile shows its state: a ring for work in progress, a full border once it is held. */
const MASTERY_RING: Record<GameState['mastery'], string> = {
  new: '',
  learning: 'ring-4 ring-ones',
  growing: 'ring-4 ring-tens',
  strong: 'ring-4 ring-spark',
}

const NEW_STATE: GameState = { game: '', mastery: 'new', total: 0, correct: 0, level: 1 }

/** A thin bar of how much of this game the student has got right so far. */
function MasteryMeter({ state }: { state: GameState }) {
  return (
    <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
      <div className="h-full rounded-full bg-felt" style={{ width: `${percentRight(state)}%` }} />
    </div>
  )
}

/** A game box: a felt lid holding the icon on a card-stock tile, then the title, state and description. */
function GameBox({ game, state }: { game: Game; state: GameState }) {
  const played = state.total > 0

  return (
    <Link
      to={game.to}
      className={`tap-target flex h-full flex-col overflow-hidden rounded-2xl border-2 border-felt-edge bg-card shadow-[0_6px_0_#163A34] active:translate-y-1 active:shadow-[0_2px_0_#163A34] ${MASTERY_RING[state.mastery]} ${FOCUS_RING}`}
    >
      <div className="flex h-24 items-center justify-center bg-felt">
        <span className="rounded-xl bg-card px-2 py-1">{game.icon}</span>
      </div>
      <div className="flex flex-1 flex-col items-start gap-1 p-4">
        <h3 className="font-display text-xl font-bold text-ink">{game.title}</h3>
        <p className="text-base text-ink">{game.description}</p>
        {played && (
          <div className="mt-2 w-full">
            <MasteryMeter state={state} />
            <p className="mt-1 font-display text-sm font-semibold text-ink-muted">
              {`${state.correct} of ${state.total} right`}
            </p>
          </div>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          {game.kind === 'robo' ? (
            <span className="rounded-full bg-hundreds px-3 py-0.5 font-display text-sm font-bold text-ink">
              vs Robo
            </span>
          ) : (
            <span className="rounded-full border-2 border-felt-edge px-3 py-0.5 font-display text-sm font-bold text-ink">
              {GRADE_BAND_LABELS[game.band]}
            </span>
          )}
          <span className="rounded-full bg-felt px-3 py-0.5 font-display text-sm font-bold text-chalk">
            {masteryLabel(state)}
          </span>
        </div>
      </div>
    </Link>
  )
}

/** Boxes in rows of equal height. */
function GameGrid({
  games,
  states,
  minWidth,
}: {
  games: Game[]
  states: Map<string, GameState>
  minWidth: '12rem' | '14rem'
}) {
  return (
    <div
      className="grid auto-rows-fr gap-6"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))` }}
    >
      {games.map((game) => (
        <GameBox key={game.to} game={game} state={states.get(gameId(game)) ?? NEW_STATE} />
      ))}
    </div>
  )
}

/**
 * The one game the engine suggests, on its own card above the shelves, with Robo saying why
 * in the same words the rule that picked it means. Absent until the home data has loaded.
 */
function PlayNext({ home, name }: { home: Home; name: string }) {
  const game = GAMES.find((candidate) => gameId(candidate) === home.suggestion.game)
  if (!game) return null

  const sentence = suggestionSentence(home.suggestion)

  return (
    <section
      aria-labelledby="play-next"
      className="w-full max-w-4xl rounded-3xl border-4 border-hundreds bg-card p-4 shadow-[0_8px_0_#163A34] sm:p-6"
    >
      <div className="mb-4 flex items-start gap-3">
        <RoboAvatar />
        <RoboBubble message={`${name}, ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}`} />
      </div>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <span className="rounded-2xl border-2 border-felt-edge bg-white px-3 py-2">{game.icon}</span>
        <div className="flex flex-1 flex-col items-center gap-1 text-center sm:items-start sm:text-left">
          <h2 id="play-next" className="font-display text-sm font-bold uppercase tracking-wide text-ink-muted">
            Play next
          </h2>
          <p className="font-display text-3xl font-bold text-ink">{game.title}</p>
          <p className="text-lg text-ink">{game.description}</p>
        </div>
        <Link
          to={game.to}
          className={`tap-target inline-flex items-center rounded-2xl bg-ink px-8 font-display text-2xl font-bold text-base shadow-[0_6px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none ${FOCUS_RING}`}
        >
          Play
        </Link>
      </div>
      <div className="mt-4">
        <ReadAloudButton text={sentence} label="Read this aloud" />
      </div>
    </section>
  )
}

/** One grade band's shelf of games against Robo, on a rail in the band's own colour. */
function Shelf({
  band,
  isYours,
  states,
}: {
  band: GradeBand
  isYours: boolean
  states: Map<string, GameState>
}) {
  const id = `shelf-${band}`
  const games = GAMES.filter((game) => game.band === band && game.kind === 'robo')

  return (
    <section aria-labelledby={id} className="w-full max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span aria-hidden="true" className={`h-6 w-3 rounded-full ${BAND_RAIL[band]}`} />
        <h2 id={id} className="font-display text-2xl font-bold text-chalk">
          {GRADE_BAND_LABELS[band]}
        </h2>
        {isYours && (
          <span className="rounded-full bg-card px-3 py-1 font-display text-sm font-bold text-ink">
            Your grade
          </span>
        )}
        <span className="ml-auto font-display text-lg font-semibold text-chalk">{`${games.length} games`}</span>
      </div>
      <div className={`mb-4 h-1.5 w-full rounded-full ${BAND_RAIL[band]}`} />
      <GameGrid games={games} states={states} minWidth="14rem" />
    </section>
  )
}

/**
 * The skill workshops' own space after the grade shelves: a card-stock panel, so solo practice
 * reads apart from the games against Robo. The student's grade comes first.
 */
function WorkshopSpace({
  bandsInOrder,
  states,
}: {
  bandsInOrder: GradeBand[]
  states: Map<string, GameState>
}) {
  const workshops = bandsInOrder.flatMap((band) =>
    GAMES.filter((game) => game.band === band && game.kind === 'workshop'),
  )

  return (
    <section
      aria-labelledby="workshops"
      className="w-full max-w-4xl rounded-3xl border-4 border-dashed border-chalk bg-card p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-col gap-1">
        <h2 id="workshops" className="font-display text-2xl font-bold">
          Skill workshops
        </h2>
        <p className="text-lg text-ink">Practice one skill at a time, one step after another.</p>
      </div>
      <GameGrid games={workshops} states={states} minWidth="12rem" />
    </section>
  )
}

function LandingPage() {
  const [band, setBand] = useState<GradeBand | null>(getGradeBand)
  const [name, setName] = useState<string | null>(getLearnerName)
  const [token, setToken] = useState<Token>(getLearnerToken)
  const [picking, setPicking] = useState<'grade' | 'profile' | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [home, setHome] = useState<Home | null>(null)

  useEffect(() => {
    if (band === null) return
    fetch(`${API_URL}/home/${getLearnerId()}?band=${band}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Home request failed'))))
      .then(setHome)
      .catch(() => setHome(null))
  }, [band, name])

  const pickBand = (chosen: GradeBand) => {
    saveGradeBand(chosen)
    setBand(chosen)
    setPicking(null)
  }

  const pickProfile = (chosenName: string, chosenToken: Token) => {
    saveLearnerName(chosenName)
    saveLearnerToken(chosenToken)
    setName(chosenName)
    setToken(chosenToken)
    setPicking(null)
  }

  if (band === null || picking === 'grade') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4 py-8">
        <GradePicker
          onPick={pickBand}
          currentBand={band}
          onCancel={band !== null ? () => setPicking(null) : undefined}
        />
      </div>
    )
  }

  if (name === null || picking === 'profile') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4 py-8">
        <ProfilePicker
          onPick={pickProfile}
          currentName={name}
          currentToken={token}
          onCancel={name !== null ? () => setPicking(null) : undefined}
        />
      </div>
    )
  }

  const shelves = showAll ? [band, ...GRADE_BANDS.filter((other) => other !== band)] : [band]
  const states = new Map((home?.games ?? []).map((state) => [state.game, state]))

  return (
    <div className="flex min-h-screen flex-col bg-felt">
      <AppHeader
        left={<span className="font-display text-2xl font-bold text-chalk">Number Quest</span>}
        right={
          <>
            <MuteToggle />
            <button
              type="button"
              onClick={() => setPicking('profile')}
              aria-label={`Playing as ${name}. Change your name or token.`}
              className={`tap-target inline-flex items-center gap-2 rounded-2xl border-2 border-felt-edge bg-card px-3 font-display text-base font-bold text-ink shadow-[0_2px_0_#163A34] ${FOCUS_RING}`}
            >
              <PlayerToken token={token} />
              <span>{name}</span>
            </button>
            <div className="flex items-center gap-2">
              <span
                aria-label={`Current grade: ${GRADE_BAND_LABELS[band]}`}
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-felt-edge bg-card px-3 py-2 font-display text-base font-bold text-ink shadow-[0_2px_0_#163A34]"
              >
                <span className="rounded-full bg-felt px-2.5 py-0.5 font-display text-xs font-bold text-chalk">
                  Grade
                </span>
                <span>{GRADE_BAND_LABELS[band]}</span>
              </span>
              <button
                type="button"
                onClick={() => setPicking('grade')}
                className={`tap-target rounded-2xl border-4 border-chalk bg-felt px-4 font-display font-semibold text-chalk ${FOCUS_RING}`}
              >
                Change grade
              </button>
            </div>
            <Link
              to="/summary"
              className={`tap-target inline-flex items-center rounded-2xl px-2 font-display font-semibold text-chalk ${FOCUS_RING}`}
            >
              Session summary
            </Link>
          </>
        }
      />

      <main className="flex flex-1 flex-col items-center gap-10 px-4 py-8">
        <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
          <h1 className="font-display text-4xl font-bold text-chalk">{QUESTION}</h1>
          <p className="text-xl text-chalk">{WELCOME}</p>
          <ReadAloudButton text={`${QUESTION} ${WELCOME}`} />
          {home && home.total_answers > 0 && (
            <p className="text-xl text-chalk">
              {`${home.total_correct} of ${home.total_answers} right so far. Keep going, ${name}.`}
            </p>
          )}
        </div>

        {home && <PlayNext home={home} name={name} />}

        {shelves.map((shelfBand) => (
          <Shelf key={shelfBand} band={shelfBand} isYours={shelfBand === band} states={states} />
        ))}
        <WorkshopSpace bandsInOrder={shelves} states={states} />
        <div className="flex justify-center pb-4">
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className={`tap-target rounded-2xl border-2 border-felt-edge bg-card px-6 py-3 font-display text-lg font-semibold text-ink shadow-[0_2px_0_#163A34] ${FOCUS_RING}`}
          >
            {showAll ? 'Show only my grade' : 'Show all grades'}
          </button>
        </div>
      </main>
    </div>
  )
}

export default LandingPage
