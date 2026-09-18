import { type Profile } from '../learner'
import PlayerToken from './PlayerToken'
import ReadAloudButton from './ReadAloudButton'

const QUESTION = "Who's playing?"

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

/**
 * The device's roster: tap a name to play as that student, or add another.
 *
 * No passwords and no server accounts -- a tap is all it takes, because this exists so
 * two students on one tablet don't share levels, not to keep anyone out.
 */
export default function ProfileSwitcher({
  roster,
  currentId,
  onPick,
  onAdd,
  onEdit,
  onCancel,
}: {
  roster: Profile[]
  currentId: string
  onPick: (profile: Profile) => void
  onAdd: () => void
  onEdit: (profile: Profile) => void
  onCancel?: () => void
}) {
  return (
    <section aria-labelledby="who-plays" className="flex w-full max-w-md flex-col items-center gap-6">
      <h1 id="who-plays" className="text-center font-display text-4xl font-bold">
        {QUESTION}
      </h1>
      <ReadAloudButton text={`${QUESTION} ${roster.map((entry) => entry.name).join('. ')}`} />

      <ul className="flex w-full flex-col gap-4">
        {roster.map((profile) => (
          <li key={profile.id} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => onPick(profile)}
              aria-current={profile.id === currentId ? 'true' : undefined}
              className={`tap-target flex min-h-20 flex-1 items-center gap-4 rounded-2xl border-2 border-felt-edge bg-card px-5 font-display text-2xl font-bold text-ink shadow-[0_6px_0_#163A34] active:translate-y-1 active:shadow-[0_2px_0_#163A34] ${FOCUS_RING} ${
                profile.id === currentId ? 'ring-4 ring-felt' : ''
              }`}
            >
              <PlayerToken token={profile.token} />
              <span className="flex-1 text-left">{profile.name}</span>
              {profile.id === currentId && (
                <span className="rounded-full bg-felt px-3 py-1 font-display text-sm font-bold text-chalk">
                  Playing
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onEdit(profile)}
              aria-label={`Change ${profile.name}'s name or token`}
              className={`tap-target rounded-2xl border-4 border-ink bg-white px-3 font-display text-base font-bold text-ink ${FOCUS_RING}`}
            >
              Edit
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className={`tap-target w-full rounded-2xl border-4 border-dashed border-ink bg-white px-6 font-display text-xl font-bold text-ink ${FOCUS_RING}`}
      >
        Add someone
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
