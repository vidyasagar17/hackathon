import { GRADE_BAND_LABELS, GRADE_BANDS, type GradeBand } from '../gradeBand'
import ReadAloudButton from './ReadAloudButton'

const QUESTION = 'What grade are you in?'

const CHOICES = GRADE_BANDS.map((band) => ({ band, label: GRADE_BAND_LABELS[band] }))

const SPOKEN_QUESTION = `${QUESTION} ${CHOICES.map((choice) => choice.label.replace('&', 'and')).join('. ')}.`

export default function GradePicker({
  onPick,
  currentBand,
  onCancel,
}: {
  onPick: (band: GradeBand) => void
  currentBand?: GradeBand | null
  onCancel?: () => void
}) {
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
        {CHOICES.map(({ band, label }) => {
          const isCurrent = currentBand === band
          return (
            <button
              key={band}
              type="button"
              onClick={() => onPick(band)}
              className={`tap-target flex min-h-20 items-center justify-between gap-4 rounded-2xl border-2 border-felt-edge bg-card px-6 font-display text-2xl font-bold text-ink shadow-[0_6px_0_#163A34] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2 active:translate-y-1 active:shadow-[0_2px_0_#163A34] ${isCurrent ? 'ring-4 ring-felt' : ''}`}
            >
              <span>{label}</span>
              {isCurrent && (
                <span className="rounded-full bg-felt px-3 py-1 font-display text-sm font-bold text-chalk">
                  Current
                </span>
              )}
            </button>
          )
        })}
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="tap-target rounded-2xl border-4 border-ink bg-white px-6 font-display text-xl font-bold text-ink shadow-[0_4px_0_#1B1B2F] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2 active:translate-y-0.5 active:shadow-[0_2px_0_#1B1B2F]"
        >
          Back to games
        </button>
      )}
    </section>
  )
}
