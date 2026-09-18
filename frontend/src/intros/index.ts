import { GRADES_23_INTROS } from './grades23'
import { GRADES_45_INTROS } from './grades45'
import { K1_INTROS } from './k1'
import type { Intro } from './types'
import { WORKSHOP_INTROS } from './workshops'

/** Every game's intro, by the game's id (the last part of its route). */
export const INTROS: Record<string, Intro> = {
  ...K1_INTROS,
  ...GRADES_23_INTROS,
  ...GRADES_45_INTROS,
  ...WORKSHOP_INTROS,
}
