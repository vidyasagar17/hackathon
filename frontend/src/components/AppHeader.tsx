import type { ReactNode } from 'react'

/** Top bar shared by every page: page content on the left, actions on the right, wrapping on narrow screens. */
export default function AppHeader({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <div className="flex items-center">{left}</div>
      <div className="flex flex-wrap items-center gap-4">{right}</div>
    </header>
  )
}
