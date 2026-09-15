/**
 * Check that every button, link and input in the app's components carries the `tap-target`
 * class (at least 64×64 px, defined in src/index.css).
 *
 * The test environment has no layout engine, so this checks the class rather than measured
 * size. It reads each opening tag up to its closing `>`, treating `=>` and `>=` inside JSX
 * expressions as part of the tag. Test files are skipped.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const OPENING_TAG = /<(button|input|Link|a)\b(?:=>|>=|[^>])*>/g

function componentFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return componentFiles(path)
    return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [path] : []
  })
}

let checked = 0
const failures = []
for (const file of componentFiles(SRC)) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(OPENING_TAG)) {
    checked += 1
    if (!match[0].includes('tap-target')) {
      const line = source.slice(0, match.index).split('\n').length
      failures.push(`${relative(SRC, file)}:${line}  <${match[1]}> has no tap-target class`)
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  console.error(`\n${failures.length} of ${checked} controls are missing tap-target`)
  process.exit(1)
}
console.log(`All ${checked} buttons, links and inputs use tap-target`)
