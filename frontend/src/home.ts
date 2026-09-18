import { formatGameName, formatMisconception } from './format'

/** One game's tile state, as `recommend.py` decided it. */
export type GameState = {
  game: string
  mastery: 'new' | 'learning' | 'growing' | 'strong'
  total: number
  correct: number
  level: number
}

export type Suggestion = {
  game: string
  reason: 'stuck_on' | 'keep_going' | 'try_new' | 'stay_sharp'
  misconception: string | null
}

export type Home = {
  games: GameState[]
  suggestion: Suggestion
  total_answers: number
  total_correct: number
}

/**
 * Robo's line about why this game is the suggested one, in words a K-5 student reads.
 *
 * The reason is decided on the server by rules; this only turns the code into a sentence,
 * so what the student is told always matches what the engine actually did.
 */
export function suggestionSentence(suggestion: Suggestion): string {
  const game = formatGameName(suggestion.game)
  switch (suggestion.reason) {
    case 'stuck_on':
      // The bug is named in quotes: read without them, "that smaller from larger" is not a sentence.
      return `That "${formatMisconception(suggestion.misconception ?? '')}" slip keeps coming back. Want another go at ${game}?`
    case 'keep_going':
      return `You were partway through ${game}. Shall we pick it back up?`
    case 'try_new':
      return `You haven't tried ${game} yet. Want to play me at it?`
    case 'stay_sharp':
      return `You've got these. ${game} is the one to keep sharp.`
  }
}

/** The short label on a tile's progress badge. */
export function masteryLabel(state: GameState): string {
  switch (state.mastery) {
    case 'new':
      return 'Not tried yet'
    case 'learning':
      return 'Learning'
    case 'growing':
      return `Level ${state.level}`
    case 'strong':
      return 'Got it'
  }
}

/** Share of this game's answers that were right, 0-100, for the tile's meter. */
export function percentRight(state: GameState): number {
  return state.total === 0 ? 0 : Math.round((100 * state.correct) / state.total)
}
