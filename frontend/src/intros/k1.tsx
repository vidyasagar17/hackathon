import DiceFace from '../components/DiceFace'
import { CardWarScene, CoverTheNumberScene, FourInARowScene, ShutTheBoxScene, TwoCards } from './k1Scenes'
import type { Intro } from './types'

const additionWar: Intro = {
  pitch: 'Flip two cards, add them up, and beat Robo! The bigger total wins the hand.',
  skill: 'adding two numbers, up to 20',
  steps: [
    'Robo flips two cards: 2 and 5. That makes 7.',
    'You flip two cards too: 3 and 6.',
    'Tap how many you have in all. Start at 6 and count on 3 more: 7, 8, 9.',
    'You have 9 and Robo has 7. 9 is more, so tap You. You win the hand!',
  ],
  scene: (step) => <CardWarScene step={step} sign="+" robo={[2, 5]} mine={[3, 6]} answers={[3, 8, 9, 10]} />,
  tryIt: {
    ask: 'You flip 4 and 3. How many in all?',
    picture: <TwoCards cards={[4, 3]} sign="+" />,
    choices: ['1', '6', '7', '8'],
    answer: '7',
    nudge: 'Start at 4 and count on 3 more: 5, 6, 7. That makes 7.',
    cheer: "Yes! 4 and 3 make 7. You're ready to play!",
  },
}

const takeAwayWar: Intro = {
  pitch: 'Flip two cards and take the smaller one away. The biggest answer wins the hand!',
  skill: 'taking away, with numbers up to 20',
  steps: [
    'Robo flips 7 and 2, and takes the 2 away. Robo has 5.',
    'You flip two cards too: 9 and 3.',
    'Take the smaller card away. Start at 9 and count back 3: 8, 7, 6.',
    'You have 6 and Robo has 5. 6 is more, so tap You. You win the hand!',
  ],
  scene: (step) => <CardWarScene step={step} sign="−" robo={[7, 2]} mine={[9, 3]} answers={[5, 6, 7, 12]} />,
  tryIt: {
    ask: 'You flip 8 and 3. Take the 3 away. How many are left?',
    picture: <TwoCards cards={[8, 3]} sign="−" />,
    choices: ['4', '5', '6', '11'],
    answer: '5',
    nudge: 'Start at 8 and count back 3: 7, 6, 5. That leaves 5.',
    cheer: "Yes! 8 take away 3 is 5. You're ready to play!",
  },
}

const shutTheBox: Intro = {
  pitch: 'Roll the dice, add the dots, and flip the tiles shut! The fewest tiles left open wins.',
  skill: 'adding the dots on two dice, and finding numbers that make a total',
  steps: [
    'Your box has tiles 1 to 9. Shut as many as you can!',
    'Roll the dice: 3 and 5.',
    'How many dots in all? Start at 5 and count on 3: 6, 7, 8. That makes 8.',
    'Shut tiles that make 8. The 8 tile works. So would 5 and 3!',
    'Robo shuts tiles in its own box. When no open tiles make your roll, your box is done. Fewest open tiles wins!',
  ],
  scene: (step) => <ShutTheBoxScene step={step} />,
  tryIt: {
    ask: 'You roll 2 and 4. How many dots in all?',
    picture: (
      <div className="flex gap-2">
        <DiceFace value={2} size="small" />
        <DiceFace value={4} size="small" />
      </div>
    ),
    choices: ['2', '5', '6', '7'],
    answer: '6',
    nudge: 'Start at 4 and count on 2 more: 5, 6. That makes 6.',
    cheer: "Yes! 2 and 4 make 6 dots. Then you shut tiles that make 6. You're ready!",
  },
}

const fourInARow: Intro = {
  pitch: 'Add the cards, cover the answer, and race Robo to get four in a row!',
  skill: 'adding, and teen numbers like 14 (1 ten and 4 ones)',
  steps: [
    'You and Robo share one board of numbers. Your spaces get your star.',
    'Your cards are 2 and 4.',
    '2 and 4 make 6. Tap a 6 to cover it!',
    'Then Robo adds its own cards and covers its answer.',
    'Next turn your cards are 1 and 1. They make 2, so you cover the 2. Four in a row! Across, down or corner to corner wins.',
  ],
  scene: (step) => <FourInARowScene step={step} />,
  tryIt: {
    ask: 'Your cards are 4 and 1. Which space shows how many in all?',
    picture: <TwoCards cards={[4, 1]} sign="+" />,
    choices: ['3', '4', '5', '6'],
    answer: '5',
    nudge: 'Start at 4 and count on 1 more: 5. That makes 5.',
    cheer: 'Yes! 4 and 1 make 5. Cover the 5 and go for four in a row!',
  },
}

const coverTheNumber: Intro = {
  pitch: 'Roll the die, count the dots, and cover that number. Cover your whole board before Robo does!',
  skill: 'counting dots and matching them to numbers',
  steps: [
    'Your board has the numbers 1 to 6.',
    'Roll the die!',
    'Count the dots: 1, 2, 3, 4. Tap the 4 to cover it!',
    'Next roll: count 1, 2. Cover the 2!',
    'Robo covers numbers on its own board. Cover all yours to win, or cover more than Robo after 10 turns!',
  ],
  scene: (step) => <CoverTheNumberScene step={step} />,
  tryIt: {
    ask: 'You roll this. How many dots?',
    picture: <DiceFace value={5} />,
    choices: ['4', '5', '6'],
    answer: '5',
    nudge: "Say one number for each dot, and each dot only once: 1, 2, 3, 4, 5. That's 5.",
    cheer: "Yes! 5 dots. You'd cover the 5. You're ready to play!",
  },
}

export const K1_INTROS: Record<string, Intro> = {
  'addition-war': additionWar,
  'take-away-war': takeAwayWar,
  'shut-the-box': shutTheBox,
  'four-in-a-row': fourInARow,
  'cover-the-number': coverTheNumber,
}
