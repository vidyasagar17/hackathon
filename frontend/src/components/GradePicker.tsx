import type { GradeBand } from '../gradeBand'
import ReadAloudButton from './ReadAloudButton'

const QUESTION = 'What grade are you in?'

const CHOICES: { band: GradeBand; label: string }[] = [
  { band: 'k-1', label: 'Kindergarten & 1st grade' },
  { band: '2-3', label: '2nd & 3rd grade' },
  { band: '4-5', label: '4th & 5th grade' },
]

const SPOKEN_QUESTION = `${QUESTION} ${CHOICES.map((choice) => choice.label.replace('&', 'and')).join('. ')}.`

export default function GradePicker({ onPick }: { onPick: (band: GradeBand) => void }) {
  return (
    <section
      aria-labelledby="grade-question"
      className="flex w-full max-w-md flex-col items-center gap-6"
    >
      <h1 id="grade-question" className="text-center font-display text-4xl font-bold">
        {QUESTION}
      </h1>
      <ReadAloudButton text={SPOKEN_QUESTION} />
      <div className="flex w-full flex-col gap-4">
        {CHOICES.map(({ band, label }) => (
          <button
            key={band}
            type="button"
            onClick={() => onPick(band)}
            className="min-h-20 rounded-3xl bg-white px-6 font-display text-2xl font-bold text-ink shadow-[0_6px_0_rgba(0,0,0,0.12)] active:translate-y-1 active:shadow-none"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
