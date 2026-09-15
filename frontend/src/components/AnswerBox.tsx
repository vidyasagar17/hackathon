import { answerFill, type Column } from '../columns'

/** One digit box of the student's answer, tinted with its place color and outlined in ink. */
export default function AnswerBox({
  column,
  value,
  onChange,
  active,
  onSelect,
  usesKeypad,
  disabled = false,
}: {
  column: Column
  value: string
  onChange: (value: string) => void
  active: boolean
  onSelect: () => void
  usesKeypad: boolean
  disabled?: boolean
}) {
  return (
    <input
      aria-label={`${column.charAt(0).toUpperCase()}${column.slice(1)} digit of your answer`}
      className={`tap-target h-16 w-16 rounded-2xl border-4 border-ink text-center font-display text-3xl font-bold text-ink focus:outline-none focus:ring-4 focus:ring-helper focus:ring-offset-2 ${active ? 'ring-4 ring-helper ring-offset-2' : ''} ${answerFill[column]}`}
      inputMode={usesKeypad ? 'none' : 'numeric'}
      value={value}
      disabled={disabled}
      onFocus={onSelect}
      onChange={(e) => {
        // No maxLength, so typing into a filled box works; keep only the digit just typed.
        const digits = e.target.value.replace(/\D/g, '')
        onChange((value && digits.length > value.length ? digits.replace(value, '') : digits).slice(-1))
      }}
    />
  )
}
