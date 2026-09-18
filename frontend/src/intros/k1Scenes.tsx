import DiceFace from '../components/DiceFace'
import PlayerToken from '../components/PlayerToken'
import PlayingCard from '../components/PlayingCard'
import RoboAvatar from '../components/RoboAvatar'
import { Arrive, Badge, Chalk, NumberTile, Seat, type SceneProps } from './parts'

/** Two cards with a sign between them, and the total when it is known, as a Card War hand lays out. */
export function Hand({ name, cards, sign, total }: { name: string; cards: [number, number]; sign: string; total?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Seat name={name} />
      <PlayingCard digit={cards[0]} />
      <Chalk>{sign}</Chalk>
      <PlayingCard digit={cards[1]} />
      <span className={total === undefined ? 'invisible' : ''}>
        <Chalk>= {total ?? 0}</Chalk>
      </span>
    </div>
  )
}

/**
 * One Card War hand: Robo's cards and total, then yours, then the answer cards with yours marked, then the winner.
 * `answers` are the four answer cards the game would deal: the right total and researched mistakes.
 */
export function CardWarScene({
  step,
  sign,
  robo,
  mine,
  answers,
}: SceneProps & { sign: string; robo: [number, number]; mine: [number, number]; answers: number[] }) {
  const work = ([a, b]: [number, number]) => (sign === '+' ? a + b : a - b)
  return (
    <div className="flex flex-col items-center gap-3">
      <Hand name="Robo" cards={robo} sign={sign} total={work(robo)} />
      <Arrive at={1} step={step} from="below">
        <Hand name="You" cards={mine} sign={sign} />
      </Arrive>
      <Arrive at={2} step={step} from="below" className="flex gap-2">
        {answers.map((answer) => (
          <NumberTile key={answer} marked={answer === work(mine)}>
            {answer}
          </NumberTile>
        ))}
      </Arrive>
      <Arrive at={3} step={step}>
        <Badge>You win the hand!</Badge>
      </Arrive>
    </div>
  )
}

export function TwoCards({ cards, sign }: { cards: [number, number]; sign: string }) {
  return (
    <div className="flex items-center gap-2">
      <PlayingCard digit={cards[0]} />
      <Chalk>{sign}</Chalk>
      <PlayingCard digit={cards[1]} />
    </div>
  )
}

/** A row of Shut the Box tiles; `shutAt` gives the step each shut tile flips down at (a tile shut from the start has 0). */
export function TileRow({ step, shutAt, animate }: { step: number; shutAt: Record<number, number>; animate: boolean }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((tile) => (
        <span key={tile} className="relative">
          <NumberTile className="h-14 w-10 min-w-10 text-xl">{tile}</NumberTile>
          {tile in shutAt &&
            (animate ? (
              <Arrive at={shutAt[tile]} step={step} className="absolute inset-0">
                <NumberTile covered={<span />} className="h-14 w-10 min-w-10" />
              </Arrive>
            ) : (
              <span className="absolute inset-0">
                <NumberTile covered={<span />} className="h-14 w-10 min-w-10" />
              </span>
            ))}
        </span>
      ))}
    </div>
  )
}

export function ShutTheBoxScene({ step }: SceneProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <Seat name="You" />
        <TileRow step={step} shutAt={{ 8: 3 }} animate />
      </div>
      <div className="flex items-center gap-3">
        <Arrive at={1} step={step} className="flex gap-2">
          <DiceFace value={3} size="small" />
          <DiceFace value={5} size="small" />
        </Arrive>
        <Arrive at={2} step={step} from="left">
          <Chalk>= 8 dots</Chalk>
        </Arrive>
      </div>
      <Arrive at={4} step={step} from="below" className="flex flex-col items-center gap-1">
        <Seat name="Robo" />
        <TileRow step={step} shutAt={{ 2: 0, 7: 0, 9: 0 }} animate={false} />
      </Arrive>
    </div>
  )
}

const FOUR_BOARD = [5, 8, 3, 9, 7, 4, 6, 2, 6, 9, 5, 7, 3, 8, 4, 10]

/** Who covers each space and at which step (0 means covered when the demo starts). */
const FOUR_COVERS: Record<number, { owner: 'mine' | 'robo'; at: number }> = {
  4: { owner: 'mine', at: 0 },
  5: { owner: 'mine', at: 0 },
  2: { owner: 'robo', at: 0 },
  9: { owner: 'robo', at: 0 },
  6: { owner: 'mine', at: 2 },
  15: { owner: 'robo', at: 3 },
  7: { owner: 'mine', at: 4 },
}

const FOUR_LINE = [4, 5, 6, 7]

export function FourInARowScene({ step }: SceneProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <div className="grid grid-cols-4 gap-2">
        {FOUR_BOARD.map((number, index) => {
          const cover = FOUR_COVERS[index]
          const inLine = step >= 4 && FOUR_LINE.includes(index)
          return (
            <span key={index} className="relative">
              <NumberTile className="w-14" marked={inLine}>
                {number}
              </NumberTile>
              {cover && (
                <Arrive at={cover.at} step={step} className="absolute inset-0">
                  <NumberTile className="w-14" marked={inLine} covered={cover.owner === 'mine' ? <PlayerToken /> : <RoboAvatar />} />
                </Arrive>
              )}
            </span>
          )
        })}
      </div>
      <Arrive at={1} step={step} from="right">
        <TwoCards cards={step >= 4 ? [1, 1] : [2, 4]} sign="+" />
      </Arrive>
    </div>
  )
}

export function CoverTheNumberScene({ step }: SceneProps) {
  const roll = step >= 3 ? 2 : 4
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Seat name="You" />
        <div className="flex flex-wrap justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((number) => (
            <span key={number} className="relative">
              <NumberTile className="w-12 min-w-12">{number}</NumberTile>
              {(number === 4 || number === 2) && (
                <Arrive at={number === 4 ? 2 : 3} step={step} className="absolute inset-0">
                  <NumberTile className="w-12 min-w-12" covered={<PlayerToken />} />
                </Arrive>
              )}
            </span>
          ))}
        </div>
      </div>
      <Arrive at={1} step={step}>
        <DiceFace value={roll} />
      </Arrive>
      <Arrive at={4} step={step} from="below" className="flex flex-wrap items-center justify-center gap-2">
        <Seat name="Robo" />
        <div className="flex flex-wrap justify-center gap-2">
          {[1, 2, 3, 4, 5, 6].map((number) => (
            <NumberTile key={number} className="w-12 min-w-12" covered={number === 1 || number === 5 ? <RoboAvatar /> : undefined}>
              {number}
            </NumberTile>
          ))}
        </div>
      </Arrive>
    </div>
  )
}
