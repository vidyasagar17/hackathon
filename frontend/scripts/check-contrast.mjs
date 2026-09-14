/**
 * Check that every text/background color pair the app uses reaches WCAG AAA (7:1).
 *
 * Reads the color tokens from src/index.css. A background can be a token or a
 * translucent token over another, written "helper/10 over white" (10% helper on white),
 * matching Tailwind classes like bg-helper/10 on a white card. Disabled controls are
 * exempt from contrast rules (WCAG 1.4.3), so faded disabled buttons are not listed.
 */
import { readFileSync } from 'node:fs'

const MIN_RATIO = 7

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
  ['ink', 'hundreds', 'digits on hundreds chips'],
  ['ink', 'tens', 'digits on tens chips'],
  ['ink', 'ones', 'digits and marks on ones chips'],
  ['ink', 'spark', 'marks on green animation badges'],
  ['base', 'ink', 'text on dark buttons'],
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
for (const [text, background, usage] of PAIRS) {
  const ratio = contrast(text, background)
  const ok = ratio >= MIN_RATIO
  if (!ok) failures += 1
  console.log(`${ok ? 'pass' : 'FAIL'}  ${ratio.toFixed(2)}:1  ${text} on ${background}  (${usage})`)
}

if (failures > 0) {
  console.error(`\n${failures} color pair(s) below ${MIN_RATIO}:1`)
  process.exit(1)
}
console.log(`\nAll ${PAIRS.length} color pairs reach ${MIN_RATIO}:1`)
