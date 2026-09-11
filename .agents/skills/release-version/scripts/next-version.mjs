import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))
const tagPrefix = 'dsh-plugins-v'
const versionPattern = /^(\d+\.\d+\.\d+)-([0-9A-Za-z-]+)\.(\d+)\.(\d+)$/

function runGit(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
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

const tags = runGit(['tag', '--list', `${tagPrefix}*`, '--sort=-version:refname'])
  .split('\n')
  .filter(Boolean)

if (!tags.length) {
  console.error(`No release tag matching ${tagPrefix}<DSH>.<revision> was found.`)
  process.exit(1)
}

const latest = { tag: tags[0], version: tags[0].slice(tagPrefix.length) }
const latestMatch = latest.version.match(versionPattern)
if (!latestMatch) {
  console.error(`Latest release tag has an unsupported version format: ${latest.tag}`)
  process.exit(1)
}
const revision = Number(latestMatch[4]) + 1
const nextVersion = `${latestMatch[1]}-${latestMatch[2]}.${latestMatch[3]}.${revision}`
const manifests = manifestPaths().map((path) => {
  const data = JSON.parse(readFileSync(path, 'utf8'))
  return { path: relative(root, path), version: data.version ?? null }
})
const versions = [...new Set(manifests.map((manifest) => manifest.version))]

if (versions.length !== 1 || versions[0] === null) {
  console.error('Workspace manifest versions are missing or inconsistent:')
  console.error(JSON.stringify(manifests, null, 2))
  process.exit(1)
}

console.log(JSON.stringify({
  latestTag: latest.tag,
  latestVersion: latest.version,
  currentManifestVersion: versions[0],
  nextVersion,
  nextTag: `${tagPrefix}${nextVersion}`,
  nextInstallTag: `v${nextVersion}`,
  manifests
}, null, 2))
