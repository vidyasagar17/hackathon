type Column = 'hundreds' | 'tens' | 'ones'

const chipColor: Record<Column, string> = {
  hundreds: 'bg-hundreds',
  tens: 'bg-tens',
  ones: 'bg-ones',
}

const borderColor: Record<Column, string> = {
  hundreds: 'border-hundreds',
  tens: 'border-tens',
  ones: 'border-ones',
}

function DigitChip({ digit, column }: { digit: number; column: Column }) {
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-2xl font-display text-3xl font-bold text-ink shadow-[0_4px_0_rgba(0,0,0,0.15)] ${chipColor[column]}`}
    >
      {digit}
    </div>
  )
}

function AnswerBox({ column }: { column: Column }) {
  return (
    <input
      className={`h-16 w-16 rounded-2xl border-4 bg-white text-center font-display text-3xl font-bold text-ink focus:outline-none ${borderColor[column]}`}
      maxLength={1}
      inputMode="numeric"
    />
  )
}

function StreakMeter({ filled, total }: { filled: number; total: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-4 w-4 rounded-full ${i < filled ? 'bg-spark' : 'bg-ink/10'}`}
        />
      ))}
    </div>
  )
}

function HintCallout({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-2xl border-l-8 border-helper bg-helper/10 p-4 text-left">
      <p className="mb-1 font-display text-sm font-semibold text-helper">Hint</p>
      <p>{text}</p>
    </div>
  )
}

function PracticePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-base px-4">
      <h1 className="font-display text-4xl font-bold">Let's subtract!</h1>

      <StreakMeter filled={2} total={5} />

      <div className="rounded-3xl bg-white p-8 shadow-[0_8px_0_rgba(0,0,0,0.1)]">
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-3">
            <DigitChip digit={7} column="hundreds" />
            <DigitChip digit={4} column="tens" />
            <DigitChip digit={2} column="ones" />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-3xl font-bold">-</span>
            <DigitChip digit={1} column="hundreds" />
            <DigitChip digit={5} column="tens" />
            <DigitChip digit={8} column="ones" />
          </div>
          <div className="h-1 w-full rounded bg-ink/20" />
          <div className="flex gap-3">
            <AnswerBox column="hundreds" />
            <AnswerBox column="tens" />
            <AnswerBox column="ones" />
          </div>
        </div>

        <button
          type="button"
          className="mt-8 w-full rounded-2xl bg-ink py-3 font-display text-xl font-semibold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none"
        >
          Check answer
        </button>

        <HintCallout text="Look at the ones column: 2 is smaller than 8, so you need to borrow from the tens column first." />
      </div>
    </div>
  )
}

export default PracticePage
