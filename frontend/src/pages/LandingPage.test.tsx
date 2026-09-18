import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import LandingPage from './LandingPage'

const WELCOME = 'Play a game against Robo, or practice one skill at a time.'

/** A home reply with nothing played yet, which is what most of these tests render against. */
const EMPTY_HOME = {
  games: [],
  suggestion: { game: 'decimal-war', reason: 'try_new', misconception: null },
  total_answers: 0,
  total_correct: 0,
}

function stubHome(home: unknown = EMPTY_HOME) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(home) })),
  )
}

beforeEach(() => {
  localStorage.clear()
  // A named learner, so these tests land on the games rather than the profile question.
  localStorage.setItem('learner_name', 'Sam')
  localStorage.setItem('learner_token', 'star')
  stubHome()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderLandingPage() {
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

function gameTitlesInOrder(): string[] {
  return screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent ?? '')
}

/** The shelf and workshop headings, in page order. The suggested game's own heading is not a shelf. */
function shelvesInOrder(): string[] {
  return screen
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent ?? '')
    .filter((text) => text !== 'Play next')
}

test('a first visit asks for the grade before showing games', () => {
  renderLandingPage()

  expect(screen.getByRole('heading', { name: 'What grade are you in?' })).toBeTruthy()
  expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
})

test('the grade question and its choices can be read aloud', async () => {
  const speak = vi.fn()
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      rate = 1
      lang = ''
      constructor(text: string) {
        this.text = text
      }
    },
  )
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Read aloud' }))

  expect(speak.mock.calls[0][0].text).toBe(
    'What grade are you in? Kindergarten and 1st grade. 2nd and 3rd grade. 4th and 5th grade.',
  )
})

test('picking 2nd & 3rd grade saves it and shows only that shelf by default', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: '2nd & 3rd grade' }))

  expect(localStorage.getItem('grade_band')).toBe('2-3')
  expect(shelvesInOrder()).toEqual(['2nd & 3rd grade', 'Skill workshops'])
  expect(gameTitlesInOrder()).toEqual([
    'For Keeps',
    'Multiplication Shootout',
    "Don't Break the Bank",
    'Target Number',
    'Clock Match',
    'Subtraction',
    'Addition',
  ])
})

test('picking 4th & 5th grade shows only its shelf and workshops by default', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: '4th & 5th grade' }))

  expect(shelvesInOrder()).toEqual(['4th & 5th grade', 'Skill workshops'])
  const shelf = screen.getByRole('region', { name: '4th & 5th grade' })
  expect(within(shelf).getByText('Your grade')).toBeTruthy()
  expect(within(shelf).queryByText('Skill workshops')).toBeNull()
  expect(gameTitlesInOrder()).toEqual([
    'Decimal War',
    'Fraction Spoons',
    'The 24 Game',
    'Coordinate Plane Battleship',
    'Volume Builder',
    'Multiplication',
    'Division',
  ])
})

test('clicking Show all grades expands to all shelves and workshops', async () => {
  const user = userEvent.setup()
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  expect(shelvesInOrder()).toEqual(['2nd & 3rd grade', 'Skill workshops'])
  await user.click(screen.getByRole('button', { name: 'Show all grades' }))

  expect(shelvesInOrder()).toEqual(['2nd & 3rd grade', 'Kindergarten & 1st grade', '4th & 5th grade', 'Skill workshops'])
  expect(gameTitlesInOrder()).toHaveLength(19)

  await user.click(screen.getByRole('button', { name: 'Show only my grade' }))
  expect(shelvesInOrder()).toEqual(['2nd & 3rd grade', 'Skill workshops'])
})

test('only the student’s shelf says Your grade', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: '4th & 5th grade' }))

  expect(screen.getAllByText('Your grade')).toHaveLength(1)
  expect(screen.queryByRole('region', { name: '2nd & 3rd grade' })).toBeNull()
})

test('kindergarten & 1st grade shows Addition War and Take-Away War against Robo', async () => {
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Kindergarten & 1st grade' }))

  expect(shelvesInOrder()[0]).toBe('Kindergarten & 1st grade')
  const shelf = screen.getByRole('region', { name: 'Kindergarten & 1st grade' })
  const additionWar = within(shelf).getByRole('link', { name: /Addition War/ })
  const takeAwayWar = within(shelf).getByRole('link', { name: /Take-Away War/ })
  expect(additionWar.getAttribute('href')).toBe('/curriculum/addition-war')
  expect(takeAwayWar.getAttribute('href')).toBe('/curriculum/take-away-war')
  expect(within(additionWar).getByText('vs Robo')).toBeTruthy()
  expect(within(takeAwayWar).getByText('vs Robo')).toBeTruthy()
  expect(screen.queryByText(/on the way/)).toBeNull()
})

test('only games against Robo carry the vs Robo tag', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  expect(within(screen.getByRole('link', { name: /Decimal War/ })).getByText('vs Robo')).toBeTruthy()
  expect(within(screen.getByRole('link', { name: /Times tables/ })).queryByText('vs Robo')).toBeNull()
})

test('the home page welcomes the student and can read the welcome aloud', async () => {
  const speak = vi.fn()
  vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn() })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      rate = 1
      lang = ''
      constructor(text: string) {
        this.text = text
      }
    },
  )
  localStorage.setItem('grade_band', '2-3')
  const user = userEvent.setup()
  renderLandingPage()

  expect(screen.getByText(WELCOME)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Read aloud' }))

  expect(speak.mock.calls[0][0].text).toBe(`What do you want to practice? ${WELCOME}`)
})

test('each shelf says how many games it holds when all grades are shown', async () => {
  const user = userEvent.setup()
  localStorage.setItem('grade_band', 'k-1')
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Show all grades' }))

  expect(within(screen.getByRole('region', { name: 'Kindergarten & 1st grade' })).getByText('5 games')).toBeTruthy()
  expect(within(screen.getByRole('region', { name: '2nd & 3rd grade' })).getByText('5 games')).toBeTruthy()
  expect(within(screen.getByRole('region', { name: '4th & 5th grade' })).getByText('5 games')).toBeTruthy()
})

test('the skill workshops have their own space after the grade shelves, each tagged with its grade', async () => {
  const user = userEvent.setup()
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Show all grades' }))

  const space = screen.getByRole('region', { name: 'Skill workshops' })
  expect(within(space).getByText('Practice one skill at a time, one step after another.')).toBeTruthy()
  const boxes = within(space).getAllByRole('link')
  expect(boxes.map((box) => box.getAttribute('href'))).toEqual([
    '/practice/multiplication',
    '/practice/division',
    '/practice/subtraction',
    '/practice/addition',
  ])
  expect(within(boxes[0]).getByText('4th & 5th grade')).toBeTruthy()
  expect(within(boxes[2]).getByText('2nd & 3rd grade')).toBeTruthy()
  for (const band of ['Kindergarten & 1st grade', '2nd & 3rd grade', '4th & 5th grade']) {
    const shelfLinks = within(screen.getByRole('region', { name: band })).getAllByRole('link')
    expect(shelfLinks.filter((link) => link.getAttribute('href')?.startsWith('/practice/'))).toEqual([])
  }
})

test('a return visit skips the grade question', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  expect(screen.queryByRole('heading', { name: 'What grade are you in?' })).toBeNull()
  expect(gameTitlesInOrder()[0]).toBe('Decimal War')
  expect(screen.getByRole('button', { name: 'Sound on' })).toBeTruthy()
})

test('the Decimal War box opens its game', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  const box = screen.getByRole('link', { name: /Decimal War/ })
  expect(box.getAttribute('href')).toBe('/curriculum/decimal-war')
})

test('the For Keeps box sits on the 2nd & 3rd grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '2nd & 3rd grade' })
  const box = within(shelf).getByRole('link', { name: /For Keeps/ })
  expect(box.getAttribute('href')).toBe('/curriculum/for-keeps')
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('the Multiplication Shootout box sits on the 2nd & 3rd grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '2nd & 3rd grade' })
  const box = within(shelf).getByRole('link', { name: /Multiplication Shootout/ })
  expect(box.getAttribute('href')).toBe('/curriculum/multiplication-shootout')
  expect(within(box).getByText('Answer times and division facts in turns with Robo')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('the Fraction Spoons box sits on the 4th & 5th grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '4th & 5th grade' })
  const box = within(shelf).getByRole('link', { name: /Fraction Spoons/ })
  expect(box.getAttribute('href')).toBe('/curriculum/fraction-spoons')
  expect(within(box).getByText('Collect four equal fractions to win a spoon')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('The 24 Game box sits on the 4th & 5th grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '4th & 5th grade' })
  const box = within(shelf).getByRole('link', { name: /The 24 Game/ })
  expect(box.getAttribute('href')).toBe('/curriculum/the-24-game')
  expect(within(box).getByText('Use all four cards with + − × ÷ to make 24')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('the Shut the Box box sits on the kindergarten & 1st grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', 'k-1')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: 'Kindergarten & 1st grade' })
  const box = within(shelf).getByRole('link', { name: /Shut the Box/ })
  expect(box.getAttribute('href')).toBe('/curriculum/shut-the-box')
  expect(within(box).getByText('Roll two dice, add the dots, and shut tiles that make that many')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test("the Don't Break the Bank box sits on the 2nd & 3rd grade shelf, opens its game and is played against Robo", () => {
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '2nd & 3rd grade' })
  const box = within(shelf).getByRole('link', { name: /Don't Break the Bank/ })
  expect(box.getAttribute('href')).toBe('/curriculum/dont-break-the-bank')
  expect(within(box).getByText('Place rolled digits, add your numbers, and get close to 1000 without going over')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('the Coordinate Plane Battleship box sits on the 4th & 5th grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '4th & 5th grade' })
  const box = within(shelf).getByRole('link', { name: /Coordinate Plane Battleship/ })
  expect(box.getAttribute('href')).toBe('/curriculum/coordinate-plane-battleship')
  expect(within(box).getByText('Write and read ordered pairs to find Robo’s hidden ships')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('the Volume Builder box sits on the 4th & 5th grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '4th & 5th grade' })
  const box = within(shelf).getByRole('link', { name: /Volume Builder/ })
  expect(box.getAttribute('href')).toBe('/curriculum/volume-builder')
  expect(within(box).getByText('Count the cubes in a box, then build a different box that holds as many')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('the Target Number box sits on the 2nd & 3rd grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '2nd & 3rd grade' })
  const box = within(shelf).getByRole('link', { name: /Target Number/ })
  expect(box.getAttribute('href')).toBe('/curriculum/target-number')
  expect(within(box).getByText('Add and take away cards one step at a time to make the target')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('the Four in a Row box sits on the kindergarten & 1st grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', 'k-1')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: 'Kindergarten & 1st grade' })
  const box = within(shelf).getByRole('link', { name: /Four in a Row/ })
  expect(box.getAttribute('href')).toBe('/curriculum/four-in-a-row')
  expect(within(box).getByText('Add two cards and cover the answer to get four in a row')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('the Cover the Number box sits on the kindergarten & 1st grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', 'k-1')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: 'Kindergarten & 1st grade' })
  const box = within(shelf).getByRole('link', { name: /Cover the Number/ })
  expect(box.getAttribute('href')).toBe('/curriculum/cover-the-number')
  expect(within(box).getByText('Roll, count the dots, and cover that number on your board')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('the Clock Match box sits on the 2nd & 3rd grade shelf, opens its game and is played against Robo', () => {
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  const shelf = screen.getByRole('region', { name: '2nd & 3rd grade' })
  const box = within(shelf).getByRole('link', { name: /Clock Match/ })
  expect(box.getAttribute('href')).toBe('/curriculum/clock-match')
  expect(within(box).getByText('Read clocks and find the clock for a time')).toBeTruthy()
  expect(within(box).getByText('vs Robo')).toBeTruthy()
})

test('Change grade asks the grade question again', async () => {
  const user = userEvent.setup()
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Change grade' }))

  expect(screen.getByRole('heading', { name: 'What grade are you in?' })).toBeTruthy()
})

test('the header displays the active grade band badge', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  const header = screen.getByRole('banner')
  expect(within(header).getByLabelText('Current grade: 4th & 5th grade')).toBeTruthy()
  expect(within(header).getByText('4th & 5th grade')).toBeTruthy()
})

test('Change grade shows Back to games which returns without changing grade', async () => {
  const user = userEvent.setup()
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Change grade' }))
  expect(screen.getByRole('heading', { name: 'What grade are you in?' })).toBeTruthy()

  await user.click(screen.getByRole('button', { name: 'Back to games' }))
  expect(screen.queryByRole('heading', { name: 'What grade are you in?' })).toBeNull()
  expect(screen.getByRole('heading', { name: 'What do you want to practice?' })).toBeTruthy()
})


test('a first visit asks who is playing once the grade is picked', async () => {
  localStorage.clear()
  stubHome()
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: '2nd & 3rd grade' }))

  expect(screen.getByRole('heading', { name: 'Who is playing?' })).toBeTruthy()
  expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
})

test('the name and token are saved and the student lands on the games', async () => {
  localStorage.clear()
  localStorage.setItem('grade_band', '4-5')
  stubHome()
  const user = userEvent.setup()
  renderLandingPage()

  await user.type(screen.getByRole('textbox', { name: 'Your name' }), 'Ada')
  await user.click(screen.getByRole('button', { name: 'rocket' }))
  await user.click(screen.getByRole('button', { name: 'Start playing' }))

  expect(localStorage.getItem('learner_name')).toBe('Ada')
  expect(localStorage.getItem('learner_token')).toBe('rocket')
  expect(screen.getByRole('heading', { name: 'What do you want to practice?' })).toBeTruthy()
})

test('the learner id is made once and kept for the next visit', () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  const id = localStorage.getItem('learner_id')
  expect(id).toMatch(/^[0-9a-f]{32}$/)
})

test('a game never tried reads as not tried yet and shows no score', async () => {
  localStorage.setItem('grade_band', '4-5')
  renderLandingPage()

  const box = await screen.findByRole('link', { name: /Decimal War/ })
  expect(within(box).getByText('Not tried yet')).toBeTruthy()
  expect(within(box).queryByText(/right$/)).toBeNull()
})

test('a game in progress shows its score and level on the tile', async () => {
  localStorage.setItem('grade_band', '4-5')
  stubHome({
    games: [{ game: 'decimal-war', mastery: 'growing', total: 10, correct: 7, level: 2 }],
    suggestion: { game: 'decimal-war', reason: 'keep_going', misconception: null },
    total_answers: 10,
    total_correct: 7,
  })
  renderLandingPage()

  const box = await screen.findByRole('link', { name: /Decimal War/ })
  expect(within(box).getByText('7 of 10 right')).toBeTruthy()
  expect(within(box).getByText('Level 2')).toBeTruthy()
})

test('Robo names the repeated mistake behind the suggested game', async () => {
  localStorage.setItem('grade_band', '4-5')
  stubHome({
    games: [{ game: 'decimal-war', mastery: 'learning', total: 8, correct: 3, level: 1 }],
    suggestion: { game: 'decimal-war', reason: 'stuck_on', misconception: 'longer_is_larger' },
    total_answers: 8,
    total_correct: 3,
  })
  renderLandingPage()

  expect(await screen.findByRole('heading', { name: 'Play next' })).toBeTruthy()
  expect(
    screen.getByText(/"longer is larger" slip keeps coming back. Want another go at Decimal War\?/),
  ).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Play' }).getAttribute('href')).toBe('/curriculum/decimal-war')
})

test('the whole-learner score is shown once something has been answered', async () => {
  localStorage.setItem('grade_band', '4-5')
  stubHome({
    games: [],
    suggestion: { game: 'decimal-war', reason: 'try_new', misconception: null },
    total_answers: 20,
    total_correct: 14,
  })
  renderLandingPage()

  expect(await screen.findByText('14 of 20 right so far. Keep going, Sam.')).toBeTruthy()
})

test('the home request asks for this learner and grade band', async () => {
  localStorage.setItem('grade_band', '2-3')
  renderLandingPage()

  await screen.findByRole('heading', { name: 'Play next' })
  const url = (globalThis.fetch as unknown as { mock: { calls: string[][] } }).mock.calls[0][0]
  expect(url).toContain(`/home/${localStorage.getItem('learner_id')}`)
  expect(url).toContain('band=2-3')
})

test('the header shows who is playing and can change it', async () => {
  localStorage.setItem('grade_band', '4-5')
  const user = userEvent.setup()
  renderLandingPage()

  await user.click(screen.getByRole('button', { name: 'Playing as Sam. Change your name or token.' }))

  expect(screen.getByRole('heading', { name: 'Who is playing?' })).toBeTruthy()
})
