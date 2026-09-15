export function formatMisconception(name: string): string {
  return name.replace(/_/g, ' ')
}

/** Title-case a game id for headings: "subtraction" -> "Subtraction", "decimal-war" -> "Decimal War". */
export function formatGameName(gameId: string): string {
  return gameId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
