import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CubeBox from './CubeBox'

function faces(container: HTMLElement, face: string) {
  return container.querySelectorAll(`path[data-face="${face}"]`)
}

describe('CubeBox', () => {
  it('draws one square per visible cube face on the front, top and side', () => {
    const { container } = render(<CubeBox box={[4, 3, 2]} />)
    expect(screen.getByRole('img', { name: 'A box of cubes 4 long, 3 wide and 2 tall' })).toBeTruthy()
    expect(faces(container, 'front')).toHaveLength(8)
    expect(faces(container, 'top')).toHaveLength(12)
    expect(faces(container, 'side')).toHaveLength(6)
    expect(container.querySelectorAll('[data-shaded]')).toHaveLength(0)
  })

  it('shades the top layer where it shows: the whole top and one row of the front and side', () => {
    const { container } = render(<CubeBox box={[4, 3, 2]} shaded="top" />)
    expect(screen.getByRole('img', { name: /with the top layer shaded/ })).toBeTruthy()
    expect(container.querySelectorAll('[data-face="top"][data-shaded]')).toHaveLength(12)
    expect(container.querySelectorAll('[data-face="front"][data-shaded]')).toHaveLength(4)
    expect(container.querySelectorAll('[data-face="side"][data-shaded]')).toHaveLength(3)
    // The top of the front face sits 1.5 cube widths down (3 cubes deep at half a cube each).
    for (const cell of container.querySelectorAll('[data-face="front"][data-shaded]')) expect(cell.getAttribute('d')).toMatch(/ 1\.5( |$)/)
  })

  it('shades the front layer: the whole front, the front row of the top and the front column of the side', () => {
    const { container } = render(<CubeBox box={[4, 3, 2]} shaded="front" />)
    expect(container.querySelectorAll('[data-face="front"][data-shaded]')).toHaveLength(8)
    expect(container.querySelectorAll('[data-face="top"][data-shaded]')).toHaveLength(4)
    expect(container.querySelectorAll('[data-face="side"][data-shaded]')).toHaveLength(2)
  })

  it('shades the side layer: the whole side and the right column of the front and top', () => {
    const { container } = render(<CubeBox box={[4, 3, 2]} shaded="side" />)
    expect(container.querySelectorAll('[data-face="side"][data-shaded]')).toHaveLength(6)
    expect(container.querySelectorAll('[data-face="front"][data-shaded]')).toHaveLength(2)
    expect(container.querySelectorAll('[data-face="top"][data-shaded]')).toHaveLength(3)
    for (const cell of container.querySelectorAll('[data-face="front"][data-shaded]')) expect(cell.getAttribute('d')).toMatch(/^M 3 /)
  })

  it('fits the largest boxes inside the size it is given', () => {
    const { container } = render(<CubeBox box={[10, 10, 10]} maxWidth={320} maxHeight={280} />)
    const svg = container.querySelector('svg')!
    expect(Number(svg.getAttribute('width'))).toBeLessThanOrEqual(320)
    expect(Number(svg.getAttribute('height'))).toBeLessThanOrEqual(280)
  })
})
