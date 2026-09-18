/** Who won a points duel against Robo, in the words the result card shows and reads aloud. */
export function duelOutcome(myPoints: number, roboPoints: number, noun: 'game' | 'duel' = 'game'): string {
  const game = noun === 'duel' ? 'this duel' : 'the game'
  if (myPoints > roboPoints) return `You win ${game}!`
  if (myPoints < roboPoints) return `Robo wins ${game}.`
  return "It's a draw!"
}
