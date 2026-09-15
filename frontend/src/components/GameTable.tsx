import type { ReactNode } from 'react'

/** The felt game table with its rim; the one bold element on a game page. */
export default function GameTable({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Game table"
      className="w-full max-w-3xl rounded-[2rem] border-[12px] border-felt-edge bg-felt p-4 sm:p-6"
    >
      {children}
    </section>
  )
}
