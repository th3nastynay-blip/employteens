/**
 * Regenerates the LOCAL_LOGOS map in lib/jobs/brands.ts from whatever is
 * actually in public/logos. Run after adding or removing a logo file.
 *
 *   node scripts/logos-manifest.mjs
 *
 * Exists because the extension varies per brand — unavatar hands back png,
 * webp or ico depending on the site — and a guessed extension list means
 * several guaranteed 404s per card before the hit.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'

const DIR = 'public/logos'
const MIN_BYTES = 400 // below this it is a placeholder, not a logo

const files = readdirSync(DIR)
  .filter((f) => /\.(png|svg|webp|ico|jpg|jpeg)$/i.test(f))
  .filter((f) => statSync(`${DIR}/${f}`).size >= MIN_BYTES)
  .sort()

const entries = files.map((f) => {
  const i = f.lastIndexOf('.')
  return `  ${f.slice(0, i)}: '${f.slice(i + 1).toLowerCase()}',`
})

const path = 'lib/jobs/brands.ts'
const src = readFileSync(path, 'utf8')
const start = src.indexOf('const LOCAL_LOGOS: Record<string, string> = {')
const end = src.indexOf('}', start)
if (start === -1) { console.error('LOCAL_LOGOS not found'); process.exit(1) }

const next =
  src.slice(0, start) +
  'const LOCAL_LOGOS: Record<string, string> = {\n' + entries.join('\n') + '\n' +
  src.slice(end)

writeFileSync(path, next)
console.log(`${files.length} logos written to LOCAL_LOGOS`)
