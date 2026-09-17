import { afterEach, expect, test, vi } from 'vitest'
import { getSessionId } from './session'

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStorage.clear()
})

test('a session id is made once per tab and reused', () => {
  const first = getSessionId()

  expect(first).toMatch(/^[0-9a-f]{32}$/)
  expect(getSessionId()).toBe(first)
  expect(sessionStorage.getItem('session_id')).toBe(first)
})

test('a session id is made without crypto.randomUUID, which plain http on a Wi-Fi address lacks', () => {
  vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(171) })

  expect(getSessionId()).toBe('ab'.repeat(16))
})
