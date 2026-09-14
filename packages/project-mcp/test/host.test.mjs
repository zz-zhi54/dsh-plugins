import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { apply } from '../src/host.mjs'
import { projectMcpFile } from '../src/config.mjs'

function makeHarness({ load = () => Promise.resolve() } = {}) {
  const calls = []
  const warnings = []
  let onCreated
  let onPreStep

  const makeAgent = (cwd) => ({
    session: { header: { cwd } },
    ctx: {
      plugin(plugin, config) {
        calls.push({ plugin, config, cwd })
        return load(config)
      },
    },
  })

  const ctx = {
    logger: {
      warn(message) {
        warnings.push(message)
      },
    },
    on(name, listener) {
      if (name === 'agent/created') onCreated = listener
      else if (name === 'agent/pre-step') onPreStep = listener
      else assert.fail(`unexpected event: ${name}`)
    },
  }
  apply(ctx)
  return {
    calls,
    warnings,
    createAgent(cwd) {
      const agent = makeAgent(cwd)
      onCreated({ agent })
      return agent
    },
    preStep(agent, next = () => Promise.resolve()) {
      return onPreStep({ agent }, next)
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
    const agentA = harness.createAgent(projectA)
    await harness.preStep(agentA)
    const agentB = harness.createAgent(projectB)
    await harness.preStep(agentB)

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

test('waits for MCP plugin startup before continuing agent/pre-step', async () => {
  const project = await makeProject([
    'servers:',
    '  - serverName: idea',
    '    transport: stdio',
    '    command: idea-mcp',
    '  - serverName: mysql',
    '    transport: stdio',
    '    command: mysql-mcp',
  ].join('\n'))

  let release
  const startup = new Promise((resolve) => {
    release = resolve
  })

  try {
    let loads = 0
    const harness = makeHarness({
      load: () => {
        loads += 1
        return loads === 1 ? startup : Promise.resolve()
      },
    })
    const agent = harness.createAgent(project)
    let nextCalls = 0
    const ready = harness.preStep(agent, async () => {
      nextCalls += 1
      return 'entered'
    })

    await Promise.resolve()
    assert.equal(harness.calls.length, 1)
    assert.equal(nextCalls, 0)

    release()
    assert.equal(await ready, 'entered')
    assert.equal(nextCalls, 1)
    assert.equal(harness.calls.length, 2)
  } finally {
    await rm(project, { recursive: true, force: true })
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
    const agent = harness.createAgent(project)
    await harness.preStep(agent)
    assert.equal(harness.calls.length, 0)
    assert.equal(harness.warnings.length, 0)
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})
