import { useState } from 'react'
import { TOKENS, type Token } from '../learner'
import PlayerToken, { TOKEN_LABELS } from './PlayerToken'
import ReadAloudButton from './ReadAloudButton'

const QUESTION = 'Who is playing?'

const SPOKEN = `${QUESTION} Type your name and pick your token.`

const MAX_NAME = 12

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

/**
 * The first-visit profile: a name and a token, saved on this device only.
 *
 * The name is what Robo greets on the home screen and the token is the student's marker at
 * every game table, so the two together are what makes a returning student recognised.
 */
export default function ProfilePicker({
  onPick,
  currentName,
  currentToken,
  onCancel,
}: {
  onPick: (name: string, token: Token) => void
  currentName?: string | null
  currentToken?: Token
  onCancel?: () => void
}) {
  const [name, setName] = useState(currentName ?? '')
  const [token, setToken] = useState<Token>(currentToken ?? 'star')
  const trimmed = name.trim()

  return (
    <section aria-labelledby="who" className="flex w-full max-w-md flex-col items-center gap-6">
      <h1 id="who" className="text-center font-display text-4xl font-bold">
        {QUESTION}
      </h1>
      <ReadAloudButton text={SPOKEN} />

      <label className="flex w-full flex-col gap-2">
        <span className="font-display text-xl font-bold">Your name</span>
        <input
          type="text"
          value={name}
          maxLength={MAX_NAME}
          onChange={(event) => setName(event.target.value)}
          className={`tap-target w-full rounded-2xl border-2 border-felt-edge bg-card px-5 font-display text-2xl font-bold text-ink shadow-[0_6px_0_#163A34] ${FOCUS_RING}`}
        />
      </label>

      <fieldset className="w-full">
        <legend className="mb-3 font-display text-xl font-bold">Pick your token</legend>
        <div className="grid grid-cols-3 gap-3">
          {TOKENS.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={token === choice}
              aria-label={TOKEN_LABELS[choice]}
              onClick={() => setToken(choice)}
              className={`tap-target flex items-center justify-center rounded-2xl border-2 border-felt-edge bg-card py-3 shadow-[0_4px_0_#163A34] ${FOCUS_RING} ${
                token === choice ? 'ring-4 ring-felt' : ''
              }`}
            >
              <PlayerToken token={choice} />
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={trimmed === ''}
        onClick={() => onPick(trimmed, token)}
        className={`tap-target w-full rounded-2xl bg-ink px-6 font-display text-2xl font-bold text-base shadow-[0_6px_0_rgba(0,0,0,0.3)] disabled:opacity-40 ${FOCUS_RING}`}
      >
        Start playing
      </button>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className={`tap-target rounded-2xl border-4 border-ink bg-white px-6 font-display text-xl font-bold text-ink shadow-[0_4px_0_#1B1B2F] ${FOCUS_RING}`}
        >
          Back to games
        </button>
      )}
    </section>
  )
}
