export function formatMisconception(name: string): string {
  return name.replace(/_/g, ' ')
}

/** Game names that title-casing the id gets wrong: small words, an apostrophe, a hyphen kept. */
const GAME_NAMES: Record<string, string> = {
  'dont-break-the-bank': "Don't Break the Bank",
  'shut-the-box': 'Shut the Box',
  'take-away-war': 'Take-Away War',
  'the-24-game': 'The 24 Game',
}

/** A game id as a heading: "subtraction" -> "Subtraction", "decimal-war" -> "Decimal War", or its name in `GAME_NAMES`. */
export function formatGameName(gameId: string): string {
  if (gameId in GAME_NAMES) return GAME_NAMES[gameId]
  return gameId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
