import type { Column } from './columns'

export const PLACE_ORDER: Column[] = ['hundreds', 'tens', 'ones']
const PROCESSING_ORDER: Column[] = ['ones', 'tens', 'hundreds']

export type RegroupStep = { from: Column; to: Column; badge: string; destMark: string }

export type RegroupConfig = {
  topDigitField: string
  regroupField: string
  transferDirection: 'from-left' | 'to-left'
  badgeLabel: string
  destMark: string
  carryField?: string
}

type ColumnData = { place: Column; [key: string]: unknown }

/**
 * Build the regroup animation steps in the order a student performs them.
 *
 * Steps run right to left, except a borrow that lends from a column whose top
 * digit is 0: a 0 has nothing to lend, so the borrow that refills it plays
 * first (302 - 158 borrows hundreds -> tens, then tens -> ones).
 */
export function buildRegroupSteps(columns: ColumnData[], config: RegroupConfig): RegroupStep[] {
  const byPlace = Object.fromEntries(columns.map((c) => [c.place, c])) as Record<Column, ColumnData>
  const steps: RegroupStep[] = []

  for (const place of PROCESSING_ORDER) {
    const idx = PLACE_ORDER.indexOf(place)
    const neighbor = idx > 0 ? PLACE_ORDER[idx - 1] : null
    if (!neighbor) continue
    if (!byPlace[place]?.[config.regroupField]) continue
    const carry = config.carryField ? String(byPlace[place][config.carryField]) : null
    const labels = {
      badge: carry ?? config.badgeLabel,
      destMark: carry ? `+${carry}` : config.destMark,
    }
    steps.push(
      config.transferDirection === 'from-left'
        ? { from: neighbor, to: place, ...labels }
        : { from: place, to: neighbor, ...labels },
    )
  }

  const lendsFromZero = (step: RegroupStep) =>
    config.transferDirection === 'from-left' && byPlace[step.from][config.topDigitField] === 0
  return [...steps.filter((s) => !lendsFromZero(s)), ...steps.filter(lendsFromZero).reverse()]
}
