import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const version = process.argv[2]
const versionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

if (!version || !versionPattern.test(version)) {
  console.error('Usage: node .agents/skills/release-version/scripts/sync-versions.mjs <version>')
  process.exit(1)
}

function manifestPaths() {
  const paths = [join(root, 'package.json')]
  for (const group of ['packages', 'packs', 'bundles']) {
    const directory = join(root, group)
    if (!existsSync(directory)) continue
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) paths.push(join(directory, entry.name, 'package.json'))
    }
  }
  return paths.filter(existsSync)
}

const changed = []
for (const path of manifestPaths()) {
  const source = readFileSync(path, 'utf8')
  const data = JSON.parse(source)
  if (typeof data.version !== 'string') {
    console.error(`Missing version field: ${relative(root, path)}`)
    process.exit(1)
  }
  if (data.version === version) continue
  data.version = version
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
  changed.push(relative(root, path))
}

console.log(JSON.stringify({ version, changed }, null, 2))
