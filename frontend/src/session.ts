const SESSION_KEY = 'session_id'

/**
 * This tab's session id, made once: 32 random hex characters.
 *
 * Built from `crypto.getRandomValues`, not `crypto.randomUUID`, which only exists on https or localhost, so a
 * tablet opening the laptop's server over Wi-Fi (plain http) can still start a session.
 */
export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    id = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}
