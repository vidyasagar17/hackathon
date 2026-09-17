/** A fraction playing card: the top number, a fraction bar and the bottom number on card stock. */
export default function FractionCard({ top, bottom }: { top: number; bottom: number }) {
  return (
    <span
      role="img"
      aria-label={`${top}/${bottom}`}
      className="flex h-24 w-16 flex-col items-center justify-center gap-1 rounded-lg border-2 border-felt-edge bg-card font-display text-3xl font-bold leading-none text-ink shadow-[0_4px_0_#163A34]"
    >
      <span aria-hidden="true">{top}</span>
      <span aria-hidden="true" className="h-1 w-10 rounded-full bg-ink" />
      <span aria-hidden="true">{bottom}</span>
    </span>
  )
}
