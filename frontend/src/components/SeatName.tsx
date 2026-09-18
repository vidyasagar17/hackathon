import PlayerToken from './PlayerToken'
import RoboAvatar from './RoboAvatar'
import RoboBubble from './RoboBubble'

/** A seat's marker and name in chalk: Robo's avatar or the student's star token. */
export default function SeatName({ name, message }: { name: 'You' | 'Robo'; message?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex flex-col items-center gap-1 font-display text-xl font-semibold text-chalk">
        {name === 'Robo' ? <RoboAvatar /> : <PlayerToken />}
        {name}
      </span>
      {name === 'Robo' && message && <RoboBubble message={message} />}
    </div>
  )
}
