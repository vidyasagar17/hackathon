export type CardBand = { name: string; letter: string; className: string }

/** A digit playing card: a large numeral with a small corner index, and an optional place band at its foot. */
export default function PlayingCard({ digit, band }: { digit: number | string; band?: CardBand }) {
  return (
    <span
      className={`relative flex h-24 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-felt-edge bg-card font-display text-5xl font-bold text-ink shadow-[0_4px_0_#163A34] ${band ? 'pb-4' : ''}`}
    >
      <span className="absolute left-1.5 top-1 text-sm leading-none">{digit}</span>
      {digit}
      {band && (
        <span
          data-place={band.name}
          className={`absolute inset-x-0 bottom-0 flex h-5 items-center justify-center font-body text-xs font-bold leading-none text-ink ${band.className}`}
        >
          {band.letter}
        </span>
      )}
    </span>
  )
}
