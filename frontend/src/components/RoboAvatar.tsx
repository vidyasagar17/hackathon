/** Robo, the computer player: one small still drawing beside its seat label, never animated. */
export default function RoboAvatar() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="h-12 w-12">
      <path d="M20 4v5" stroke="#F4EEDC" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="4" r="2.5" fill="#FFD23F" />
      <rect x="7" y="10" width="26" height="22" rx="7" fill="#F4EEDC" />
      <circle cx="15" cy="20" r="3" fill="#1B1B2F" />
      <circle cx="25" cy="20" r="3" fill="#1B1B2F" />
      <path d="M15 27h10" stroke="#1B1B2F" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
