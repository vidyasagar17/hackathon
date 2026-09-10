const TUTORIAL_KEY = 'tutorial_seen'

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === 'true'
  } catch {
    return false
  }
}

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, 'true')
  } catch {
    // private browsing or similar - tutorial will just show again next time
  }
}
