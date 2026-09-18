/**
 * An accessible speech bubble representing Robo's playful dialogue with the student.
 * Card-stock fill, crisp felt edge, and dark ink text (15.65:1 AAA contrast).
 * Includes an SVG tail pointing toward Robo's avatar.
 */
export default function RoboBubble({ message }: { message: string }) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative max-w-xs rounded-2xl border-2 border-felt-edge bg-card px-4 py-2 font-display text-base font-semibold text-ink shadow-[0_3px_0_#163A34] sm:max-w-sm"
    >
      <p>{message}</p>
      {/* Speech bubble tail pointing left toward Robo */}
      <svg
        aria-hidden="true"
        className="absolute -bottom-2.5 left-4 h-3 w-4 text-felt-edge"
        viewBox="0 0 16 12"
        fill="none"
      >
        <path d="M0 0L8 12L16 0H0Z" fill="#FBF6EA" stroke="#163A34" strokeWidth="2" />
      </svg>
    </div>
  )
}
