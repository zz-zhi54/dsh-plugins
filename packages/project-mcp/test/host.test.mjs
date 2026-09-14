import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { apply } from '../src/host.mjs'
import { projectMcpFile } from '../src/config.mjs'

function makeHarness() {
  const calls = []
  const warnings = []
  let onCreated
  const ctx = {
    logger: {
      warn(message) {
        warnings.push(message)
      },
    },
    on(name, listener) {
      assert.equal(name, 'agent/created')
      onCreated = listener
    },
  }
  apply(ctx)
  return {
    calls,
    warnings,
    createAgent(cwd) {
      const agent = {
        session: { header: { cwd } },
        ctx: {
          plugin(plugin, config) {
            calls.push({ plugin, config, cwd })
            return Promise.resolve()
          },
        },
      }
      onCreated({ agent })
      return agent
    },
  }
}

async function makeProject(contents) {
  const project = await mkdtemp(join(tmpdir(), 'dsh-project-mcp-'))
  await mkdir(join(project, '.dsh'))
  await writeFile(projectMcpFile(project), contents)
  return project
}

test('loads each Agent project from its Session cwd and allows same names', async () => {
  const projectA = await makeProject([
    'servers:',
    '  - serverName: idea',
    '    transport: stdio',
    '    command: idea-a',
    '  - serverName: mysql',
    '    transport: stdio',
    '    command: mysql-a',
  ].join('\n'))
  const projectB = await makeProject([
    'servers:',
    '  - serverName: idea',
    '    transport: stdio',
    '    command: idea-b',
    '  - serverName: github',
    '    transport: stdio',
    '    command: github-b',
  ].join('\n'))

  try {
    const harness = makeHarness()
    harness.createAgent(projectA)
    harness.createAgent(projectB)

    assert.deepEqual(
      harness.calls.map(({ config, cwd }) => [cwd, config.serverName, config.command, config.cwd]),
      [
        [projectA, 'idea', 'idea-a', projectA],
        [projectA, 'mysql', 'mysql-a', projectA],
        [projectB, 'idea', 'idea-b', projectB],
        [projectB, 'github', 'github-b', projectB],
      ],
    )
    assert.equal(harness.warnings.length, 0)
  } finally {
    await Promise.all([
      rm(projectA, { recursive: true, force: true }),
      rm(projectB, { recursive: true, force: true }),
    ])
  }
})

test('an invalid server fails the Agent startup', async () => {
  const project = await makeProject([
    'servers:',
    '  - serverName: broken',
    '    transport: unsupported',
    '  - serverName: valid',
    '    transport: stdio',
    '    command: valid-mcp',
  ].join('\n'))

  try {
    const harness = makeHarness()
    assert.throws(() => harness.createAgent(project), /servers\[0\]\.transport must be/)
    assert.equal(harness.calls.length, 0)
    assert.equal(harness.warnings.length, 0)
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})

test('a project without mcp.yml remains untouched', async () => {
  const project = await mkdtemp(join(tmpdir(), 'dsh-project-mcp-'))
  try {
    const harness = makeHarness()
    harness.createAgent(project)
    assert.equal(harness.calls.length, 0)
    assert.equal(harness.warnings.length, 0)
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})
