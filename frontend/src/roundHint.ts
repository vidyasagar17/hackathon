import { useCallback, useRef, useState } from 'react'
import { postJson } from './api'

type HintReply<Cards> = { hint: string | null; cards?: Cards | null }

/**
 * The "Show me why" hint for a game round: `showWhy` asks the server for it (only when the student presses the
 * button), and `clearHint` empties it and cancels any request still on the way, so an older hint never appears beside
 * a newer answer. `cards` is the hint picture's data for games that send one (Fraction Spoons).
 */
export function useRoundHint<Cards = null>() {
  const [hint, setHint] = useState<string | null>(null)
  const [cards, setCards] = useState<Cards | null>(null)
  const [hintError, setHintError] = useState(false)
  const request = useRef<AbortController | null>(null)

  const clearHint = useCallback(() => {
    request.current?.abort()
    setHint(null)
    setCards(null)
    setHintError(false)
  }, [])

  const showWhy = useCallback((roundId: string | null) => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setHintError(false)
    postJson<HintReply<Cards>>(`/rounds/${roundId}/hint`, undefined, controller.signal)
      .then((reply) => {
        if (controller.signal.aborted) return
        setHint(reply.hint)
        setCards(reply.cards ?? null)
      })
      .catch(() => {
        if (!controller.signal.aborted) setHintError(true)
      })
  }, [])

  return { hint, cards, hintError, showWhy, clearHint }
}
