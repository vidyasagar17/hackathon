const PLACE_NAMES: Record<number, string> = { 1: 'tenth', 2: 'hundredth', 3: 'thousandth' }
const CELL = 10
const STEP = CELL + 1

/**
 * A decimal drawn on a 10×10 grid of hundredths, for the "same number of digits" hint.
 *
 * Shading fills whole columns first, so each tenth is one column. A thousandths digit shades that
 * many of the 10 slivers in the next square (0.405 is 40 squares and 5 slivers). The caption counts
 * the number in `places` decimal places, matching the hint sentence. Static: nothing animates.
 */
export default function HundredthsGrid({ digits, places }: { digits: string; places: number }) {
  const label = `0.${digits}`
  const thousandths = Number(digits.padEnd(3, '0'))
  const fullSquares = Math.floor(thousandths / 10)
  const slivers = thousandths % 10
  const count = Number(digits.padEnd(places, '0'))
  const caption = `${label} = ${count} ${PLACE_NAMES[places]}${count === 1 ? '' : 's'}`

  return (
    <figure className="flex flex-col items-center gap-2">
      <svg
        role="img"
        aria-label={`${label} shaded: ${thousandths / 10} of 100 squares`}
        viewBox={`0 0 ${10 * STEP + 1} ${10 * STEP + 1}`}
        className="h-40 w-40"
      >
        <rect width={10 * STEP + 1} height={10 * STEP + 1} className="fill-felt-edge" />
        {Array.from({ length: 100 }, (_, index) => {
          const column = Math.floor(index / 10)
          const x = 1 + column * STEP
          const y = 1 + (index % 10) * STEP
          if (index < fullSquares) {
            return (
              <rect
                key={index}
                data-shaded="square"
                data-column={column}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                className="fill-felt"
              />
            )
          }
          return (
            <g key={index}>
              <rect x={x} y={y} width={CELL} height={CELL} className="fill-white" />
              {index === fullSquares &&
                Array.from({ length: slivers }, (_, sliver) => (
                  <rect
                    key={sliver}
                    data-shaded="sliver"
                    x={x + sliver}
                    y={y}
                    width={1}
                    height={CELL}
                    className="fill-felt"
                  />
                ))}
            </g>
          )
        })}
      </svg>
      <figcaption className="font-display text-lg font-semibold text-ink">{caption}</figcaption>
    </figure>
  )
}
