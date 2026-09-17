type Fraction = { top: number; bottom: number }

const WIDTH = 288
const LABEL_WIDTH = 76
const BAR_LENGTH = WIDTH - LABEL_WIDTH - 4
const BAR_HEIGHT = 32
const GAP = 12
/** The largest bottom still cut into parts; a /100 bar shows only its shaded length. */
const MAX_CUT_PARTS = 36

/**
 * Two fractions as bars of the same length, the Collecting card on top: each bar is cut into its
 * bottom number of parts, with its top number shaded. A dashed line marks where the Collecting card's
 * shading ends, so equal fractions line up and a bigger or smaller one visibly passes or falls short.
 * Static: nothing animates. Cards are never above 1.
 */
export default function FractionBars({ cards }: { cards: [Fraction, Fraction] }) {
  const height = 2 * BAR_HEIGHT + GAP + 4
  const guideX = LABEL_WIDTH + (BAR_LENGTH * cards[0].top) / cards[0].bottom
  const label = cards.map((card) => `${card.top}/${card.bottom}: ${card.top} of ${card.bottom} parts shaded`).join(', ')

  return (
    <svg role="img" aria-label={`Fraction bars. ${label}`} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full">
      {cards.map((card, row) => (
        <Bar key={row} card={card} y={2 + row * (BAR_HEIGHT + GAP)} />
      ))}
      <line
        data-guide
        x1={guideX}
        x2={guideX}
        y1={0}
        y2={height}
        strokeWidth={2}
        strokeDasharray="5 4"
        className="stroke-helper-text"
      />
    </svg>
  )
}

function Bar({ card, y }: { card: Fraction; y: number }) {
  const part = BAR_LENGTH / card.bottom
  const cuts = card.bottom <= MAX_CUT_PARTS ? card.bottom - 1 : 0

  return (
    <g>
      <text
        x={LABEL_WIDTH - 10}
        y={y + BAR_HEIGHT / 2}
        textAnchor="end"
        dominantBaseline="central"
        className="fill-ink font-display text-lg font-bold"
      >
        {`${card.top}/${card.bottom}`}
      </text>
      <rect x={LABEL_WIDTH} y={y} width={BAR_LENGTH} height={BAR_HEIGHT} className="fill-white" />
      <rect data-shaded x={LABEL_WIDTH} y={y} width={part * card.top} height={BAR_HEIGHT} className="fill-tens" />
      {Array.from({ length: cuts }, (_, index) => {
        const x = LABEL_WIDTH + part * (index + 1)
        return <line key={index} data-cut x1={x} x2={x} y1={y} y2={y + BAR_HEIGHT} strokeWidth={1} className="stroke-ink" />
      })}
      <rect
        x={LABEL_WIDTH}
        y={y}
        width={BAR_LENGTH}
        height={BAR_HEIGHT}
        strokeWidth={2}
        className="fill-none stroke-ink"
      />
    </g>
  )
}
