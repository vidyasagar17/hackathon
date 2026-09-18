import type { Intro } from './types'
import { ColumnScene, DivisionScene } from './workshopScenes'

const HINT_STEP =
  'Get one wrong? You get a hint made for your exact mistake, and you can watch what you did, step by step.'

const subtraction: Intro = {
  pitch: 'Take big numbers apart, column by column. When the ones run short, trade a ten!',
  skill: 'subtracting bigger numbers, with borrowing',
  steps: [
    'Numbers are colored by place: blue tens and pink ones. Work the ones first.',
    '2 is less than 7, so trade 1 ten for 10 ones. 5 tens become 4, and 2 ones become 12.',
    '12 − 7 = 5. Write 5 in the ones.',
    'Now the tens: 4 − 1 = 3. So 52 − 17 = 35!',
    HINT_STEP,
  ],
  scene: (step) => (
    <ColumnScene
      step={step}
      work={{
        sign: '−',
        top: { tens: 5, ones: 2 },
        bottom: { tens: 1, ones: 7 },
        answer: { tens: 3, ones: 5 },
        answerAt: { ones: 2, tens: 3 },
        regroup: { place: 'ones', mark: '+10', from: 'left', at: 1, source: { place: 'tens', mark: '−1' } },
        hintAt: 4,
        hint: 'Look at the ones: 2 is smaller than 7, so borrow from the tens first.',
      }}
    />
  ),
  tryIt: {
    ask: 'What is 43 − 18?',
    choices: ['25', '35', '61'],
    answer: '25',
    nudge: '3 ones is less than 8, so trade a ten: 13 − 8 = 5. Then 3 tens − 1 ten = 2 tens. That makes 25.',
    cheer: "Yes! 43 − 18 = 25. You're ready!",
  },
}

const addition: Intro = {
  pitch: 'Stack the numbers, add column by column, and carry a ten when the ones overflow!',
  skill: 'adding bigger numbers, with carrying',
  steps: [
    'Numbers are colored by place: blue tens and pink ones. Add the ones first.',
    '7 + 8 = 15. Write the 5 in the ones...',
    '...and carry the 1 ten over to the tens.',
    'Now the tens: 4 + 3 + the 1 you carried = 8. So 47 + 38 = 85!',
    HINT_STEP,
  ],
  scene: (step) => (
    <ColumnScene
      step={step}
      work={{
        sign: '+',
        top: { tens: 4, ones: 7 },
        bottom: { tens: 3, ones: 8 },
        answer: { tens: 8, ones: 5 },
        answerAt: { ones: 1, tens: 3 },
        regroup: { place: 'tens', mark: '+1', from: 'right', at: 2 },
        hintAt: 4,
        hint: '7 + 8 is 15: write the 5 and carry the 1 ten to the tens.',
      }}
    />
  ),
  tryIt: {
    ask: 'What is 36 + 27?',
    choices: ['53', '63', '513'],
    answer: '63',
    nudge: '6 + 7 = 13: write the 3 and carry 1 ten. Then 3 + 2 + 1 = 6 tens. That makes 63.',
    cheer: "Yes! 36 + 27 = 63. You're ready!",
  },
}

const multiplication: Intro = {
  pitch: 'Multiply column by column, carry the tens, and build big answers!',
  skill: 'times tables and multiplying bigger numbers',
  steps: [
    'Numbers are colored by place: blue tens and pink ones. Multiply the ones first.',
    '4 × 3 ones = 12 ones. Write the 2 in the ones...',
    '...and carry the 1 ten over to the tens.',
    '4 × 2 tens = 8 tens, plus the 1 you carried: 9. So 23 × 4 = 92!',
    HINT_STEP,
  ],
  scene: (step) => (
    <ColumnScene
      step={step}
      work={{
        sign: '×',
        top: { tens: 2, ones: 3 },
        bottom: { ones: 4 },
        answer: { tens: 9, ones: 2 },
        answerAt: { ones: 1, tens: 3 },
        regroup: { place: 'tens', mark: '+1', from: 'right', at: 2 },
        hintAt: 4,
        hint: 'Add the 1 you carried after you multiply the tens: 8 + 1 = 9.',
      }}
    />
  ),
  tryIt: {
    ask: 'What is 14 × 3?',
    choices: ['17', '32', '42'],
    answer: '42',
    nudge: '3 × 4 ones = 12: write the 2 and carry 1 ten. 3 × 1 ten = 3 tens, plus the 1 you carried: 4 tens. That makes 42.',
    cheer: "Yes! 14 × 3 = 42. You're ready!",
  },
}

const division: Intro = {
  pitch: 'Share big numbers into equal groups, one place at a time!',
  skill: 'dividing bigger numbers into equal groups',
  steps: [
    'Split 84 into 4 equal groups. Start with the tens.',
    '8 tens ÷ 4 = 2 tens. Write the 2.',
    'Now bring down the 4 ones: 4 ÷ 4 = 1. Write the 1.',
    '84 ÷ 4 = 21. Check it: 4 groups of 21 make 84!',
    HINT_STEP,
  ],
  scene: (step) => <DivisionScene step={step} />,
  tryIt: {
    ask: 'What is 96 ÷ 3?',
    choices: ['3', '23', '32'],
    answer: '32',
    nudge: '9 tens ÷ 3 = 3 tens. Then bring down the 6 ones: 6 ÷ 3 = 2. That makes 32.',
    cheer: "Yes! 96 ÷ 3 = 32. You're ready!",
  },
}

export const WORKSHOP_INTROS: Record<string, Intro> = { subtraction, addition, multiplication, division }
