import { DEFAULT_TOKEN, type Token } from '../learner'

/**
 * The student's seat marker on the game table: a brass token in the shape they picked,
 * the same size as Robo, never animated.
 *
 * Each shape gets its own disc colour so two students on one device can tell their
 * tokens apart at a glance, and every one of them is dark ink on a bright fill.
 */

const DISC: Record<Token, string> = {
  star: '#FFD23F',
  rocket: '#2EC4F1',
  heart: '#FF8F91',
  leaf: '#3DDC97',
  moon: '#8C6FF7',
  bolt: '#FFC9A3',
}

const SHAPE: Record<Token, string> = {
  star: 'M20 10.5l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L20 25l-5.7 3 1.2-6.4-4.7-4.4 6.4-.8z',
  rocket: 'M20 9c3.5 3 5.5 7 5.5 11.5L20 25l-5.5-4.5C14.5 16 16.5 12 20 9zm-6.5 13.5l-2 5 5-2zm13 0l2 5-5-2z',
  heart: 'M20 28c-6-4.2-8.5-7.2-8.5-10.4A4.4 4.4 0 0120 15a4.4 4.4 0 018.5 2.6c0 3.2-2.5 6.2-8.5 10.4z',
  leaf: 'M27 12c0 8-4.5 13.5-11.5 15 .5-6 3-9.5 7.5-12-4.5 1-7.5 3.5-9.5 7C11 15.5 17 11 27 12z',
  moon: 'M24.5 10A9.5 9.5 0 0020 28a9.5 9.5 0 004.5-1.2 8 8 0 010-16.8z',
  bolt: 'M22.5 9l-8 11h4.5l-1.5 10 8-11h-4.5z',
}

const LABEL: Record<Token, string> = {
  star: 'star',
  rocket: 'rocket',
  heart: 'heart',
  leaf: 'leaf',
  moon: 'moon',
  bolt: 'lightning bolt',
}

export const TOKEN_LABELS = LABEL

export default function PlayerToken({ token = DEFAULT_TOKEN }: { token?: Token }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="h-12 w-12">
      <circle cx="20" cy="20" r="16" fill={DISC[token]} stroke="#163A34" strokeWidth="2.5" />
      <path d={SHAPE[token]} fill="#1B1B2F" strokeLinejoin="round" />
    </svg>
  )
}
