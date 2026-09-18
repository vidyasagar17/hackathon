import DigitChip from '../components/DigitChip'
import { Arrive, Badge, Chalk, Reveal, type From, type SceneProps } from './parts'

type Place = 'tens' | 'ones'

const PLACES: Place[] = ['tens', 'ones']

const BOX_BORDER: Record<Place, string> = { tens: 'border-tens', ones: 'border-ones' }

/**
 * A two-digit column problem worked the way the workshop works it: the regroup mark for one column (the borrowed
 * ten, or the carried one) moves in from the column it comes from, and each answer digit lands in its own step,
 * ones first. `source` is the mark left on the other column, shown with the moving mark but not moving itself.
 */
export type ColumnWork = {
  sign: string
  top: Partial<Record<Place, number>>
  bottom: Partial<Record<Place, number>>
  answer: Record<Place, number>
  answerAt: Record<Place, number>
  regroup: { place: Place; mark: string; from: From; at: number; source?: { place: Place; mark: string } }
  hintAt: number
  hint: string
}

export function Mark({ children }: { children: string }) {
  return <span className="rounded-full bg-hundreds px-2 font-display text-lg font-bold text-ink">{children}</span>
}

export function ColumnScene({ step, work }: SceneProps & { work: ColumnWork }) {
  const { regroup } = work
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid grid-cols-[2.5rem_3.5rem_3.5rem] items-center justify-items-center gap-x-3 gap-y-2">
        <span />
        {PLACES.map((place) => (
          <div key={place} className="flex h-8 items-center">
            {regroup.place === place && (
              <Arrive at={regroup.at} step={step} from={regroup.from}>
                <Mark>{regroup.mark}</Mark>
              </Arrive>
            )}
            {regroup.source?.place === place && (
              <Reveal at={regroup.at} step={step}>
                <Mark>{regroup.source.mark}</Mark>
              </Reveal>
            )}
          </div>
        ))}

        <span />
        {PLACES.map((place) => {
          const digit = work.top[place]
          return digit === undefined ? <span key={place} /> : <DigitChip key={place} digit={digit} column={place} size="sm" />
        })}

        <Chalk>{work.sign}</Chalk>
        {PLACES.map((place) => {
          const digit = work.bottom[place]
          return digit === undefined ? <span key={place} /> : <DigitChip key={place} digit={digit} column={place} size="sm" />
        })}

        <span />
        <div className="col-span-2 h-1 w-full rounded bg-chalk" />

        <span />
        {PLACES.map((place) => (
          <span key={place} className={`flex h-14 w-14 items-center justify-center rounded-2xl border-4 bg-card ${BOX_BORDER[place]}`}>
            <Arrive at={work.answerAt[place]} step={step}>
              <span className="font-display text-3xl font-bold text-ink">{work.answer[place]}</span>
            </Arrive>
          </span>
        ))}
      </div>
      <Arrive at={work.hintAt} step={step} from="below" className="w-full max-w-sm">
        <p className="rounded-2xl border-l-8 border-helper bg-card p-3 text-left text-base text-ink">
          <span className="font-display font-semibold text-helper-text">Hint: </span>
          {work.hint}
        </p>
      </Arrive>
    </div>
  )
}

export function DivisionScene({ step }: SceneProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <Chalk size="text-4xl">84 ÷ 4 =</Chalk>
        {[2, 1].map((digit, index) => (
          <span key={digit} className={`flex h-14 w-14 items-center justify-center rounded-2xl border-4 bg-card ${index === 0 ? 'border-tens' : 'border-ones'}`}>
            <Arrive at={index + 1} step={step}>
              <span className="font-display text-3xl font-bold text-ink">{digit}</span>
            </Arrive>
          </span>
        ))}
      </div>
      <Arrive at={3} step={step} from="below">
        <Badge>Check: 4 × 21 = 84</Badge>
      </Arrive>
      <Arrive at={4} step={step} from="below" className="w-full max-w-sm">
        <p className="rounded-2xl border-l-8 border-helper bg-card p-3 text-left text-base text-ink">
          <span className="font-display font-semibold text-helper-text">Hint: </span>
          Don't stop after the tens digit: bring down the ones digit and keep going.
        </p>
      </Arrive>
    </div>
  )
}
