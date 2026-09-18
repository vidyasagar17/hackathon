import CubeBox from '../components/CubeBox'
import FractionCard from '../components/FractionCard'
import { BattleshipScene, DecimalWarScene, FractionSpoonsScene, Grid, GridLayer, Point, TwentyFourScene, VolumeBuilderScene } from './grades45Scenes'
import type { Intro } from './types'

const decimalWar: Intro = {
  pitch: 'Whose decimal is bigger? Compare and outsmart Robo. Careful: longer is not always larger!',
  skill: 'comparing decimals with tenths and hundredths',
  steps: [
    'You and Robo each get a decimal. Robo has 0.45.',
    'You have 0.8. Is 0.45 bigger because it has more digits?',
    'No! Give both the same number of digits: 0.8 is the same as 0.80.',
    '80 hundredths is more than 45 hundredths, so 0.8 is larger. Tap the larger number each hand!',
  ],
  scene: (step) => <DecimalWarScene step={step} />,
  tryIt: {
    ask: 'Which is larger?',
    choices: ['0.3', '0.25'],
    answer: '0.3',
    nudge: 'Give both numbers two digits: 0.30 and 0.25. 30 hundredths is more than 25 hundredths, so 0.3 is larger.',
    cheer: "Yes! 0.3 is 0.30, and that beats 0.25. You're ready to play!",
  },
}

const fractionSpoons: Intro = {
  pitch: 'Collect four equal fractions and grab the spoon before Robo does! First to 3 spoons wins.',
  skill: 'spotting equal fractions, like 1/2 = 2/4',
  steps: [
    'Your hand: 1/2, 2/4, 3/6 and 2/3. You pick 1/2 to collect, so you want four cards equal to 1/2.',
    'Draw a card: 4/8.',
    'Does it fit? 4 is half of 8, so 4/8 = 1/2. Tap Fits!',
    '2/3 does not fit: 2 is more than half of 3. Discard it.',
    'Four cards equal to 1/2! Claim the spoon. First to 3 spoons wins.',
  ],
  scene: (step) => <FractionSpoonsScene step={step} />,
  tryIt: {
    ask: 'You are collecting 1/2. Does 5/10 fit?',
    picture: <FractionCard top={5} bottom={10} />,
    choices: ['Fits', "Doesn't fit"],
    answer: 'Fits',
    nudge: '5 is half of 10, so 5/10 = 1/2. Bigger numbers can still make an equal fraction.',
    cheer: "Yes! 5/10 = 1/2, so it fits. You're ready to collect some spoons!",
  },
}

const twentyFour: Intro = {
  pitch: 'Four cards. Any of + − × ÷. Can you make exactly 24? Race Robo over five hands!',
  skill: 'order of operations and parentheses',
  steps: [
    'Your four cards: 3, 5, 3 and 1. Use every card once to make 24.',
    'Try 3 + 5 first: that makes 8.',
    '8 × 3 = 24!',
    'Times 1 keeps it 24. Tap the cards and signs to build (3 + 5) × 3 × 1, then press Check.',
    'The parentheses matter! Without them, × comes before +, and it only makes 18.',
  ],
  scene: (step) => <TwentyFourScene step={step} />,
  tryIt: {
    ask: 'Your cards: 2, 3, 4 and 1. Which one makes 24?',
    choices: ['2 + 3 + 4 + 1', '(2 + 3) × 4 × 1', '2 × 3 × 4 × 1', '2 × 3 + 4 × 1'],
    answer: '2 × 3 × 4 × 1',
    nudge: 'Work it out step by step: 2 × 3 = 6, 6 × 4 = 24, and 24 × 1 is still 24.',
    cheer: "Yes! 2 × 3 × 4 × 1 = 24. You're ready to play!",
  },
}

const coordinateBattleship: Intro = {
  pitch: "Hunt down Robo's hidden ships! Call the right ordered pair and fire. Most hits in 8 shots wins.",
  skill: 'reading and writing ordered pairs on a grid',
  steps: [
    "This is Robo's ocean. Its ships are hiding somewhere on the grid!",
    'Tap a point to aim.',
    'Write its ordered pair. Across first: 3. Then up: 2. That makes (3, 2).',
    'Fire! The shot lands at (3, 2). A hit!',
    'On Robo’s turn, Robo calls a pair and you tap that point on your own ocean.',
  ],
  scene: (step) => <BattleshipScene step={step} />,
  tryIt: {
    ask: 'What ordered pair names this point?',
    picture: (
      <Grid>
        <GridLayer>
          <Point x={1} y={3} />
        </GridLayer>
      </Grid>
    ),
    choices: ['(1, 3)', '(3, 1)', '(2, 4)'],
    answer: '(1, 3)',
    nudge: "Count across first: 1. Then count up: 3. Across comes first, so it's (1, 3).",
    cheer: "Yes! (1, 3): 1 across, 3 up. You're ready to hunt some ships!",
  },
}

const volumeBuilder: Intro = {
  pitch: 'How many cubes fill the box, even the hidden ones? Count them, then build your own box that holds just as many!',
  skill: 'volume: length × width × height',
  steps: [
    'How many cubes fill this box? Some are hiding inside and behind!',
    'Count the top layer: 3 across and 2 back make 3 × 2 = 6 cubes.',
    'The box has 2 layers, so 2 × 6 = 12 cubes.',
    'Now build a different box that holds 12: 6 long, 2 wide and 1 high works!',
  ],
  scene: (step) => <VolumeBuilderScene step={step} />,
  tryIt: {
    ask: 'How many cubes are in this box?',
    picture: <CubeBox box={[2, 2, 2]} maxWidth={150} maxHeight={130} />,
    choices: ['6', '7', '8', '12'],
    answer: '8',
    nudge: 'The top layer has 2 × 2 = 4 cubes, and 2 layers make 2 × 4 = 8. One cube is hidden in the back!',
    cheer: "Yes! 8 cubes, even the hidden one. You're ready to build!",
  },
}

export const GRADES_45_INTROS: Record<string, Intro> = {
  'decimal-war': decimalWar,
  'fraction-spoons': fractionSpoons,
  'the-24-game': twentyFour,
  'coordinate-plane-battleship': coordinateBattleship,
  'volume-builder': volumeBuilder,
}
