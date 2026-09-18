import { ClockMatchScene, DemoClock, DontBreakTheBankScene, ForKeepsScene, MultiplicationShootoutScene, TargetNumberScene } from './grades23Scenes'
import type { Intro } from './types'

const clockMatch: Intro = {
  pitch: 'Can you read a clock like a pro? Match clocks and times, turn by turn, and beat Robo!',
  skill: 'telling time to 5 minutes on a clock with hands',
  steps: [
    'The short hand is the hour hand. It points to the 3, so it is 3 o’clock.',
    'The long hand is the minute hand. Each number is 5 more minutes. Watch it go to the 6: 30 minutes.',
    'The hour hand moves too! At half past 3 it sits halfway between the 3 and the 4.',
    'So the time is 3:30. Each turn, pick the time for a clock or the clock for a time. Most right in 8 turns wins!',
  ],
  scene: (step) => <ClockMatchScene step={step} />,
  tryIt: {
    ask: 'What time does this clock show?',
    picture: <DemoClock hour={75} minute={180} size="h-36 w-36" />,
    choices: ['2:06', '2:30', '3:30'],
    answer: '2:30',
    nudge: "The long minute hand is on the 6, and each number is 5 minutes: 30 minutes. The short hand is just past the 2, so it's 2:30.",
    cheer: "Yes! 2:30, half past 2. You're ready to beat Robo!",
  },
}

const targetNumber: Intro = {
  pitch: 'Hit the target number! Add and take away your cards one step at a time, and land right on it.',
  skill: 'adding and taking away in your head, and what the = sign means',
  steps: [
    'Your target is 15. You start with your 9 card.',
    'Tap +, then the 8, and type the new total: 9 + 8 = 17.',
    '17 is too many. Tap −, then the 2: 17 − 2 = 15.',
    '15, right on target! With every step right, that scores a point.',
    'After Robo’s turn, fill in the box so both sides make 15.',
  ],
  scene: (step) => <TargetNumberScene step={step} />,
  tryIt: {
    ask: 'Fill in the box: 15 = 9 + ☐',
    choices: ['6', '15', '24'],
    answer: '6',
    nudge: '= means both sides are the same amount. 9 + 6 = 15, so the box is 6.',
    cheer: "Yes! 15 = 9 + 6. Both sides make 15. You're ready!",
  },
}

const dontBreakTheBank: Intro = {
  pitch: 'Roll, place and add! Build three numbers that get as close to 1000 as you dare, without breaking the bank.',
  skill: 'hundreds, tens and ones, and adding big numbers',
  steps: [
    'The bank is 1000. You will build three numbers, add them, and try to get close to 1000.',
    'Roll the die: 4.',
    'Put the 4 in a spot. It stays there for good! A 4 in the hundreds is worth 400.',
    'Keep rolling until every spot is full: 456, 365 and 163.',
    'Add them: 984. That is only 16 away from 1000! Closest without going over wins.',
  ],
  scene: (step) => <DontBreakTheBankScene step={step} />,
  tryIt: {
    ask: 'Which total breaks the bank?',
    choices: ['875', '950', '998', '1012'],
    answer: '1012',
    nudge: 'Breaking the bank means going over 1000. 1012 is 12 more than 1000.',
    cheer: "Yes! 1012 is over 1000, so it breaks the bank. 998 would be super close! You're ready.",
  },
}

const multiplicationShootout: Intro = {
  pitch: 'A times-table showdown! You and Robo take turns answering facts. Get more right to win!',
  skill: 'times facts and division facts',
  steps: [
    'Robo calls a fact for you: 6 × 7.',
    '6 × 7 means 6 rows of 7.',
    'Count by 7s: 7, 14, 21, 28, 35, 42. Type 42 on the keypad!',
    'Then Robo answers a fact of its own. Robo can miss too!',
    'Ten turns each. Whoever gets more right wins the shootout!',
  ],
  scene: (step) => <MultiplicationShootoutScene step={step} />,
  tryIt: {
    ask: 'Robo calls 3 × 4. What is it?',
    choices: ['7', '12', '16'],
    answer: '12',
    nudge: '3 × 4 is 3 groups of 4: 4, 8, 12. That makes 12.',
    cheer: "Yes! 3 × 4 = 12. You're ready for the shootout!",
  },
}

const forKeeps: Intro = {
  pitch: 'Build two numbers, subtract, and decide: keep it or trash it? The lowest total wins!',
  skill: 'subtracting two-digit numbers, with trading a ten',
  steps: [
    'You get four digit cards: 7, 3, 5 and 8.',
    'Make two numbers with them. Put the bigger one on top: 73.',
    'And 58 underneath.',
    'Subtract and type the difference: 73 − 58 = 15.',
    'Keep it or trash it! You keep two scores in four hands. The lowest total wins, so small is good!',
  ],
  scene: (step) => <ForKeepsScene step={step} />,
  tryIt: {
    ask: 'Your cards make 62 and 38. What is 62 − 38?',
    choices: ['24', '34', '36'],
    answer: '24',
    nudge: '2 ones is less than 8, so trade a ten: 12 − 8 = 4. Then 5 tens − 3 tens = 2 tens. 62 − 38 = 24.',
    cheer: "Yes! 62 − 38 = 24. Now you'd pick: keep it or trash it? You're ready!",
  },
}

export const GRADES_23_INTROS: Record<string, Intro> = {
  'clock-match': clockMatch,
  'target-number': targetNumber,
  'dont-break-the-bank': dontBreakTheBank,
  'multiplication-shootout': multiplicationShootout,
  'for-keeps': forKeeps,
}
