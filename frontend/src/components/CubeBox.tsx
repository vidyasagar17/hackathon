export type Box = [number, number, number]

export type Layer = 'top' | 'front' | 'side'

/** How far one cube of depth moves a line right and up, in cube widths (an oblique drawing). */
const DEPTH = 0.5

type Point = [number, number]

const path = (points: Point[]) => `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`

/**
 * A box of unit cubes drawn from the front, top and right side with every cube edge, as in textbook "how many
 * cubes?" pictures: length goes across, width goes back, height goes up. `shaded` fills one layer (the top layer,
 * the front layer, or the right-side layer) in the hint purple on the faces where it shows. Static: nothing animates.
 * The drawing scales to fit `maxWidth` × `maxHeight` pixels, capped so one cube is at most 48 px.
 */
export default function CubeBox({
  box,
  shaded,
  maxWidth = 320,
  maxHeight = 280,
}: {
  box: Box
  shaded?: Layer
  maxWidth?: number
  maxHeight?: number
}) {
  const [length, width, height] = box
  const back = width * DEPTH
  const viewWidth = length + back
  const viewHeight = height + back
  const scale = Math.min(maxWidth / viewWidth, maxHeight / viewHeight, 48)

  const front = (x: number, y: number): Point => [x, back + height - y]
  const top = (x: number, z: number): Point => [x + z * DEPTH, back - z * DEPTH]
  const side = (z: number, y: number): Point => [length + z * DEPTH, back + height - y - z * DEPTH]

  const cells: { d: string; face: 'front' | 'top' | 'side'; lit: boolean }[] = []
  for (let x = 0; x < length; x += 1)
    for (let y = 0; y < height; y += 1)
      cells.push({
        d: path([front(x, y), front(x + 1, y), front(x + 1, y + 1), front(x, y + 1)]),
        face: 'front',
        lit: (shaded === 'top' && y === height - 1) || shaded === 'front' || (shaded === 'side' && x === length - 1),
      })
  for (let x = 0; x < length; x += 1)
    for (let z = 0; z < width; z += 1)
      cells.push({
        d: path([top(x, z), top(x + 1, z), top(x + 1, z + 1), top(x, z + 1)]),
        face: 'top',
        lit: shaded === 'top' || (shaded === 'front' && z === 0) || (shaded === 'side' && x === length - 1),
      })
  for (let z = 0; z < width; z += 1)
    for (let y = 0; y < height; y += 1)
      cells.push({
        d: path([side(z, y), side(z + 1, y), side(z + 1, y + 1), side(z, y + 1)]),
        face: 'side',
        lit: (shaded === 'top' && y === height - 1) || (shaded === 'front' && z === 0) || shaded === 'side',
      })

  const faceFill = { front: 'fill-card', top: 'fill-white', side: 'fill-chalk' }
  const label = `A box of cubes ${length} long, ${width} wide and ${height} tall${shaded ? `, with the ${shaded} layer shaded` : ''}`

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`-0.05 -0.05 ${viewWidth + 0.1} ${viewHeight + 0.1}`}
      width={viewWidth * scale}
      height={viewHeight * scale}
    >
      {cells.map((cell, index) => (
        <path
          key={index}
          d={cell.d}
          data-face={cell.face}
          data-shaded={cell.lit || undefined}
          className={`${cell.lit ? 'fill-helper' : faceFill[cell.face]} stroke-ink`}
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
