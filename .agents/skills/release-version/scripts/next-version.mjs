import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../', import.meta.url))

function runGit(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

function manifestPaths() {
  const paths = [join(root, 'package.json')]
  const directory = join(root, 'packages')
  if (existsSync(directory)) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) paths.push(join(directory, entry.name, 'package.json'))
    }
  }
  return paths.filter(existsSync)
}

function currentVersion() {
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
  return { version: versions[0], manifests }
}

function tagExists(tag) {
  return runGit(['tag', '--list', tag]) === tag
}

function bumpRevision(version) {
  const prerelease = version.match(/^(\d+\.\d+\.\d+-.*)\.(\d+)$/)
  if (prerelease) {
    return `${prerelease[1]}.${Number(prerelease[2]) + 1}`
  }

  const stable = version.match(/^(\d+\.\d+\.\d+)-plugin\.(\d+)$/)
  if (stable) {
    return `${stable[1]}-plugin.${Number(stable[2]) + 1}`
  }

  console.error(`Unsupported plugin version format: ${version}`)
  process.exit(1)
}

const current = currentVersion()
const currentTag = `v${current.version}`
const exists = tagExists(currentTag)
const publishVersion = exists ? bumpRevision(current.version) : current.version

console.log(JSON.stringify({
  currentVersion: current.version,
  currentTag,
  currentTagExists: exists,
  action: exists ? 'bump-plugin-revision' : 'publish-current-version',
  publishVersion,
  publishTag: `v${publishVersion}`,
  manifests: current.manifests
}, null, 2))
