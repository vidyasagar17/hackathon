const TUTORIAL_KEY = 'tutorial_seen'

export function hasSeenTutorial(): boolean {
  return localStorage.getItem(TUTORIAL_KEY) === 'true'
}

export function markTutorialSeen(): void {
  localStorage.setItem(TUTORIAL_KEY, 'true')
}
