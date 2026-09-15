import PlayerToken from './PlayerToken'
import RoboAvatar from './RoboAvatar'

/** A seat's marker and name in chalk: Robo's avatar or the student's star token. */
export default function SeatName({ name }: { name: 'You' | 'Robo' }) {
  return (
    <span className="flex flex-col items-center gap-1 font-display text-xl font-semibold text-chalk">
      {name === 'Robo' ? <RoboAvatar /> : <PlayerToken />}
      {name}
    </span>
  )
}
