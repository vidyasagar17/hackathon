import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { useRoundHint } from './roundHint'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubHint(reply: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(reply) })))
}

test('showWhy asks the round for its hint and keeps the hint and its cards', async () => {
  stubHint({ misconception: 'x', hint: 'Count on.', cards: [1, 2] })
  const { result } = renderHook(() => useRoundHint<number[]>())

  act(() => result.current.showWhy('round-1'))

  await waitFor(() => expect(result.current.hint).toBe('Count on.'))
  expect(result.current.cards).toEqual([1, 2])
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain('/rounds/round-1/hint')
})

test('a failed hint sets the error, and clearHint empties everything', async () => {
  stubHint({ detail: 'nope' }, false)
  const { result } = renderHook(() => useRoundHint())

  act(() => result.current.showWhy('round-1'))
  await waitFor(() => expect(result.current.hintError).toBe(true))

  act(() => result.current.clearHint())
  expect(result.current.hintError).toBe(false)
  expect(result.current.hint).toBeNull()
})

test('a hint cleared while it is on the way never appears', async () => {
  let release: (value: unknown) => void = () => {}
  vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((resolve, reject) => {
    release = resolve
    init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })))
  const { result } = renderHook(() => useRoundHint())

  act(() => result.current.showWhy('round-1'))
  act(() => result.current.clearHint())
  release({ ok: true, json: () => Promise.resolve({ hint: 'Late hint.' }) })

  await new Promise((resolve) => setTimeout(resolve, 20))
  expect(result.current.hint).toBeNull()
  expect(result.current.hintError).toBe(false)
})
