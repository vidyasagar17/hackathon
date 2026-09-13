export function formatMisconception(name: string): string {
  return name.replace(/_/g, ' ')
}

export function formatGameName(gameId: string): string {
  return gameId.charAt(0).toUpperCase() + gameId.slice(1)
}
