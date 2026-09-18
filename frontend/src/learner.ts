/**
 * The student's profile on this device: an id that outlives the tab, plus the name and
 * token they picked.
 *
 * Kept in localStorage, unlike the session id in `session.ts`, which is deliberately
 * per-tab. The session says what happened this sitting; the learner says who this is, so
 * levels and mastery survive closing the browser. This is a device-local profile only --
 * there are no accounts and nothing leaves the machine but the random id.
 */

const LEARNER_KEY = 'learner_id'
const NAME_KEY = 'learner_name'
const TOKEN_KEY = 'learner_token'
const ROSTER_KEY = 'learner_roster'

/** The tokens a student can sit behind, as emoji-free named shapes drawn by `PlayerToken`. */
export const TOKENS = ['star', 'rocket', 'heart', 'leaf', 'moon', 'bolt'] as const

export type Token = (typeof TOKENS)[number]

export const DEFAULT_TOKEN: Token = 'star'

/**
 * This device's learner id, made once: 32 random hex characters.
 *
 * Built from `crypto.getRandomValues` for the same reason as the session id: a tablet
 * reaching the laptop over plain http has no `crypto.randomUUID`.
 */
export function getLearnerId(): string {
  let id = localStorage.getItem(LEARNER_KEY)
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(LEARNER_KEY, id)
  }
  return id
}

/** The name the student typed, or null before they have picked one. */
export function getLearnerName(): string | null {
  return localStorage.getItem(NAME_KEY)
}

export function saveLearnerName(name: string): void {
  localStorage.setItem(NAME_KEY, name)
}

/** The token the student picked, falling back to the star for an unknown saved value. */
export function getLearnerToken(): Token {
  const saved = localStorage.getItem(TOKEN_KEY)
  return TOKENS.find((token) => token === saved) ?? DEFAULT_TOKEN
}

export function saveLearnerToken(token: Token): void {
  localStorage.setItem(TOKEN_KEY, token)
}

/** One saved profile on this device. */
export type Profile = {
  id: string
  name: string
  token: Token
}

/**
 * Everyone who plays on this device.
 *
 * A family tablet or a classroom machine is shared, so the device holds a roster rather
 * than one student. Switching is a tap on a name -- there are no passwords and no server
 * accounts, so a profile protects nobody's privacy from someone holding the device. It
 * exists so two students don't share one set of levels.
 */
export function getRoster(): Profile[] {
  const saved = localStorage.getItem(ROSTER_KEY)
  if (!saved) return []
  const parsed: unknown = JSON.parse(saved)
  if (!Array.isArray(parsed)) return []
  return parsed.filter(
    (entry): entry is Profile =>
      typeof entry?.id === 'string' &&
      typeof entry?.name === 'string' &&
      TOKENS.includes(entry?.token),
  )
}

function saveRoster(roster: Profile[]): void {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(roster))
}

/** Add a profile, or update the one already holding this id, and make it the current one. */
export function rememberProfile(profile: Profile): void {
  const others = getRoster().filter((entry) => entry.id !== profile.id)
  saveRoster([...others, profile])
  switchTo(profile)
}

/** Make an existing profile the one playing now. */
export function switchTo(profile: Profile): void {
  localStorage.setItem(LEARNER_KEY, profile.id)
  localStorage.setItem(NAME_KEY, profile.name)
  localStorage.setItem(TOKEN_KEY, profile.token)
}

/** A fresh learner id for a profile being added. */
export function newLearnerId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Remove a profile. Its attempts stay on the server; only this device forgets it. */
export function forgetProfile(id: string): void {
  saveRoster(getRoster().filter((entry) => entry.id !== id))
}
