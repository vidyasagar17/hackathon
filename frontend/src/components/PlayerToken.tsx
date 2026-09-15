/** The student's seat marker on the game table: a brass star token, the same size as Robo, never animated. */
export default function PlayerToken() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="h-12 w-12">
      <circle cx="20" cy="20" r="16" fill="#FFD23F" stroke="#163A34" strokeWidth="2.5" />
      <path
        d="M20 10.5l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L20 25l-5.7 3 1.2-6.4-4.7-4.4 6.4-.8z"
        fill="#1B1B2F"
        strokeLinejoin="round"
      />
    </svg>
  )
}
