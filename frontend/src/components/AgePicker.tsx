import { AGES, bandForAge, GRADE_BAND_LABELS } from '../gradeBand'
import ReadAloudButton from './ReadAloudButton'

const QUESTION = 'How old are you?'

const SPOKEN = `${QUESTION} Tap your age.`

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

/**
 * The first question a new student answers: an age, tapped rather than typed, which sets
 * the shelf they land on.
 *
 * Age is asked instead of grade because a 5-year-old knows how old they are more reliably
 * than which band their grade sits in. Each button names the shelf it leads to, so the
 * mapping is never hidden, and the grade can still be changed afterwards.
 */
export default function AgePicker({ onPick }: { onPick: (age: number) => void }) {
  return (
    <section aria-labelledby="age-question" className="flex w-full max-w-md flex-col items-center gap-6">
      <h1 id="age-question" className="text-center font-display text-4xl font-bold">
        {QUESTION}
      </h1>
      <ReadAloudButton text={SPOKEN} />

      <div className="grid w-full grid-cols-4 gap-3">
        {AGES.map((age) => (
          <button
            key={age}
            type="button"
            onClick={() => onPick(age)}
            aria-label={`${age} years old, ${GRADE_BAND_LABELS[bandForAge(age)]}`}
            className={`tap-target flex min-h-20 items-center justify-center rounded-2xl border-2 border-felt-edge bg-card font-display text-3xl font-bold text-ink shadow-[0_6px_0_#163A34] active:translate-y-1 active:shadow-[0_2px_0_#163A34] ${FOCUS_RING}`}
          >
            {age}
          </button>
        ))}
      </div>

      <p className="text-center text-lg text-ink">
        We'll pick your games from this. You can change it later.
      </p>
    </section>
  )
}
