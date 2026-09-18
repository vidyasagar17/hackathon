/**
 * Check that every color pair the app uses reaches its WCAG minimum: 7:1 (AAA) for text,
 * 3:1 for non-text edges such as input outlines.
 *
 * Reads the color tokens from src/index.css. A background can be a token or a
 * translucent token over another, written "helper/10 over white" (10% helper on white),
 * matching Tailwind classes like bg-helper/10 on a white card. Disabled controls are
 * exempt from contrast rules (WCAG 1.4.3), so faded disabled buttons are not listed.
 */
import { readFileSync } from 'node:fs'

const TEXT_MINIMUM = 7
const NON_TEXT_MINIMUM = 3

const PAIRS = [
  ['ink', 'base', 'body text on the page'],
  ['ink', 'white', 'body text on cards'],
  ['ink-muted', 'base', 'secondary links in page headers'],
  ['ink-muted', 'white', 'secondary text on cards'],
  ['ink-muted', 'helper/10 over white', 'diagnosed pattern in the hint box'],
  ['success-text', 'white', '"Correct!" on the problem card'],
  ['alert-text', 'base', 'error messages on the page'],
  ['alert-text', 'white', 'error messages on cards'],
  ['alert-text', 'helper/10 over white', '"Not quite" in the hint box'],
  ['helper-text', 'helper/10 over white', 'hint label in the tutorial'],
  ['ink', 'ink/10 over base', 'Level and Coming soon pills'],
  ['ink', 'hundreds', 'digits and H letters on hundreds chips'],
  ['ink', 'tens', 'digits and T letters on tens chips'],
  ['ink', 'ones', 'digits, O letters and marks on ones chips'],
  ['ink', 'spark', 'marks on green animation badges'],
  ['base', 'ink', 'text on dark buttons'],
  ['ink', 'hundreds/25 over white', 'digits in hundreds answer boxes'],
  ['ink', 'tens/25 over white', 'digits in tens answer boxes'],
  ['ink', 'ones/25 over white', 'digits in ones answer boxes'],
  ['ink', 'ink/10 over white', 'digits in the thousands answer box'],
  ['ink', 'white', 'answer box outline on the problem card', NON_TEXT_MINIMUM],
  ['helper', 'white', 'focus ring around the active answer box', NON_TEXT_MINIMUM],
  ['chalk', 'felt', 'seat names, "0." and the question on the game table'],
  ['ink', 'card', 'digits on playing cards'],
  ['success-text', 'card', '"Correct!" on the result note'],
  ['alert-text', 'card', '"Not quite" on the result note'],
  ['ink-muted', 'card', 'diagnosed pattern on the result note'],
  ['ink', 'card', 'hint text on the result note'],
  ['hundreds', 'felt', 'brass "Larger" outline and focus ring on the table', NON_TEXT_MINIMUM],
  ['felt-edge', 'base', 'game box border on the home shelves', NON_TEXT_MINIMUM],
  ['helper', 'base', 'focus ring around a game box', NON_TEXT_MINIMUM],
  ['ink-muted', 'base', '"Games against Robo" and "Skill workshops" labels'],
  ['ink', 'tenths', 't letter on the tenths band of a playing card'],
  ['ink', 'hundredths', 'h letter on the hundredths band of a playing card'],
  ['ink', 'thousandths', 'th letter on the thousandths band of a playing card'],
  ['chalk/60 over felt', 'felt', 'outline marking each seat and "They\'re the same" as buttons', NON_TEXT_MINIMUM],
  ['ink', 'tens/25 over card', 'T letter in an empty For Keeps tens slot'],
  ['ink', 'ones/25 over card', 'O letter in an empty For Keeps ones slot'],
  ['chalk', 'felt-edge', 'numbers on shut tiles in Shut the Box'],
  ['tens', 'felt', 'your ship points on the Battleship grid', NON_TEXT_MINIMUM],
  ['ones', 'felt', 'hit marks on the Battleship grid', NON_TEXT_MINIMUM],
  ['ink', 'ones', 'the × on a hit mark'],
  ['chalk/70 over felt-edge', 'felt', 'dashed outline of an empty spot in Don\'t Break the Bank', NON_TEXT_MINIMUM],
  ['ink', 'white', 'cube edges on the top of a Volume Builder box', NON_TEXT_MINIMUM],
  ['ink', 'card', 'cube edges on the front of a Volume Builder box', NON_TEXT_MINIMUM],
  ['ink', 'chalk', 'cube edges on the side of a Volume Builder box', NON_TEXT_MINIMUM],
  ['ink', 'helper', 'cube edges on a shaded Volume Builder layer', NON_TEXT_MINIMUM],
  ['helper', 'white', 'a shaded Volume Builder layer beside unshaded top squares', NON_TEXT_MINIMUM],
  ['helper', 'card', 'a shaded Volume Builder layer beside unshaded front squares', NON_TEXT_MINIMUM],
  ['helper', 'chalk', 'a shaded Volume Builder layer beside unshaded side squares', NON_TEXT_MINIMUM],
  ['chalk', 'felt', 'the edge of a Volume Builder box against the table', NON_TEXT_MINIMUM],
  ['felt', 'ink/10 over card', "the filled part of a game's score bar on the session summary", NON_TEXT_MINIMUM],
['chalk', 'felt', 'the home screen heading, welcome and shelf headings on the felt table'],  ['spark', 'felt', 'the kindergarten and 1st grade shelf rail', 3],  ['tens', 'felt', 'the 2nd and 3rd grade shelf rail', 3],  ['hundreds', 'felt', 'the 4th and 5th grade shelf rail', 3],  ['ink-muted', 'card', 'the "Play next" label and a tile score on the suggested game card'],  ['chalk', 'felt', 'the mastery badge on a game tile'],  ['hundreds', 'felt', 'the border of the suggested game card against the table', 3],  ['spark', 'felt', 'the ring on a game tile the student has got, outside the tile border', 3],  ['tens', 'felt', 'the ring on a game tile in progress, outside the tile border', 3],  ['ones', 'felt', 'the ring on a game tile still being learned, outside the tile border', 3],
]

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const tokens = { white: '#FFFFFF' }
for (const [, name, hex] of css.matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
  tokens[name] = hex
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)

function resolve(color) {
  const blended = color.match(/^([\w-]+)\/(\d+) over ([\w-]+)$/)
  if (!blended) return rgb(tokens[color])
  const [, top, percent, bottom] = blended
  const alpha = Number(percent) / 100
  return rgb(tokens[top]).map((c, i) => c * alpha + rgb(tokens[bottom])[i] * (1 - alpha))
}

function luminance(channels) {
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a, b) {
  const [hi, lo] = [luminance(resolve(a)), luminance(resolve(b))].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

let failures = 0
for (const [foreground, background, usage, minimum = TEXT_MINIMUM] of PAIRS) {
  const ratio = contrast(foreground, background)
  const ok = ratio >= minimum
  if (!ok) failures += 1
  console.log(
    `${ok ? 'pass' : 'FAIL'}  ${ratio.toFixed(2)}:1 (needs ${minimum}:1)  ${foreground} on ${background}  (${usage})`,
  )
}

if (failures > 0) {
  console.error(`\n${failures} color pair(s) below their minimum`)
  process.exit(1)
}
console.log(`\nAll ${PAIRS.length} color pairs reach their minimum`)
