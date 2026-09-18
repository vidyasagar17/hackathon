const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const KEY_STYLE =
  'rounded-2xl bg-white font-display text-3xl font-bold text-ink shadow-[0_4px_0_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2'

/** On-screen number pad for grades 2–3, so the device keyboard never covers the problem. */
export default function Keypad({
  onDigit,
  onDelete,
  onCheck,
  checkDisabled,
}: {
  onDigit: (digit: string) => void
  onDelete: () => void
  onCheck: () => void
  checkDisabled: boolean
}) {
  return (
    <div role="group" aria-label="Number keypad" className="grid w-full max-w-xs grid-cols-3 gap-3">
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          onClick={() => onDigit(digit)}
          className={`tap-target ${KEY_STYLE}`}
        >
          {digit}
        </button>
      ))}
      <button type="button" onClick={onDelete} className={`tap-target ${KEY_STYLE} text-lg`}>
        Delete
      </button>
      <button type="button" onClick={() => onDigit('0')} className={`tap-target ${KEY_STYLE}`}>
        0
      </button>
      <button
        type="button"
        onClick={onCheck}
        disabled={checkDisabled}
        className="tap-target rounded-2xl bg-ink font-display text-lg font-semibold leading-tight text-base disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-helper focus-visible:ring-offset-2"
      >
        Check answer
      </button>
    </div>
  )
}
