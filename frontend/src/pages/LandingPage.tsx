import { Link } from 'react-router-dom'

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-base">
      <header className="px-6 py-4">
        <span className="font-display text-2xl font-bold">Number Quest</span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="max-w-xl font-display text-5xl font-bold">
          Practice subtraction, one problem at a time
        </h1>
        <p className="max-w-md text-lg">
          Solve subtraction problems and get a hint made for the exact mistake
          you made, not just "try again."
        </p>
        <Link
          to="/practice"
          className="rounded-2xl bg-ink px-8 py-4 font-display text-xl font-semibold text-base shadow-[0_4px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-none"
        >
          Start practicing
        </Link>
      </main>
    </div>
  )
}

export default LandingPage
