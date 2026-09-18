import type { ReactNode } from 'react'

/**
 * A "Your turn!" question at the end of the demo: one move from the game for the student to try before playing.
 * It is practice only, never graded or logged. `nudge` is what a wrong tap is told (the right way, in the same
 * words the game's own hints use), and `cheer` what a right tap is told.
 */
export type TryIt = {
  ask: string
  picture?: ReactNode
  choices: string[]
  answer: string
  nudge: string
  cheer: string
}

/**
 * What a game's intro screen says before the game starts. `pitch` sells the game in a sentence or two; `skill` names
 * the math it practices; `steps` are the demo's captions in order, and `scene` draws the demo table at a step,
 * bringing in exactly one new piece per step.
 */
export type Intro = {
  pitch: string
  skill: string
  steps: string[]
  scene: (step: number) => ReactNode
  tryIt: TryIt
}
