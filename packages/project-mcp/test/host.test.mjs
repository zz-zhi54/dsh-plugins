import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { apply } from '../src/host.mjs'
import { projectMcpFile } from '../src/config.mjs'

function makeHarness({ load = () => Promise.resolve() } = {}) {
  const calls = []
  const errors = []
  let onCreated
  let onPreStep
  let onDisposed
  const originalConsoleError = console.error
  console.error = (...args) => errors.push(args)

  const makeAgent = (cwd) => {
    const tools = {
      schemas() {
        return []
      },
      get() {
        return undefined
      },
      register() {
        return () => {}
      },
    }
    return {
      session: { header: { cwd } },
      ctx: {
        get(name) {
          if (name === 'tools') return tools
          return undefined
        },
        plugin(plugin, config) {
          calls.push({ plugin, config, cwd })
          return load(config)
        },
      },
    }
  }

  const ctx = {
    on(name, listener) {
      if (name === 'agent/created') onCreated = listener
      else if (name === 'agent/disposed') onDisposed = listener
      else if (name === 'agent/pre-step') onPreStep = listener
      else if (name === 'tools/change') return () => {}
      else assert.fail(`unexpected event: ${name}`)
    },
  }
  apply(ctx)
  return {
    calls,
    errors,
    createAgent(cwd) {
      const agent = makeAgent(cwd)
      onCreated({ agent })
      return agent
    },
    announce(agent) {
      onCreated({ agent })
    },
    preStep(agent, next = () => Promise.resolve()) {
      return onPreStep({ agent }, next)
    },
    restore() {
      console.error = originalConsoleError
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

  const harness = makeHarness()
  try {
    const agentA = harness.createAgent(projectA)
    await harness.preStep(agentA)
    const agentB = harness.createAgent(projectB)
    await harness.preStep(agentB)

    assert.deepEqual(
      harness.calls.map(({ config, cwd }) => [cwd, config.command, config.cwd]),
      [
        [projectA, 'idea-a', projectA],
        [projectA, 'mysql-a', projectA],
        [projectB, 'idea-b', projectB],
        [projectB, 'github-b', projectB],
      ],
    )
    assert.match(harness.calls[0].config.serverName, /^idea-[0-9a-z]+-0$/)
    assert.match(harness.calls[1].config.serverName, /^mysql-[0-9a-z]+-1$/)
    assert.match(harness.calls[2].config.serverName, /^idea-[0-9a-z]+-0$/)
    assert.match(harness.calls[3].config.serverName, /^github-[0-9a-z]+-1$/)
    assert.notEqual(harness.calls[0].config.serverName, harness.calls[2].config.serverName)
    assert.equal(harness.errors.length, 0)
  } finally {
    harness.restore()
    await Promise.all([
      rm(projectA, { recursive: true, force: true }),
      rm(projectB, { recursive: true, force: true }),
    ])
  }
})

test('does not mount the same Agent twice', async () => {
  const project = await makeProject([
    'servers:',
    '  - serverName: idea',
    '    transport: stdio',
    '    command: idea-mcp',
  ].join('\n'))
  const harness = makeHarness()

  try {
    const agent = harness.createAgent(project)
    harness.announce(agent)
    await harness.preStep(agent)
    assert.equal(harness.calls.length, 1)
    assert.equal(harness.errors.length, 0)
  } finally {
    harness.restore()
    await rm(project, { recursive: true, force: true })
  }
})

test('uses a unique runtime serverName for each Agent', async () => {
  const project = await makeProject([
    'servers:',
    '  - serverName: idea',
    '    transport: stdio',
    '    command: idea-mcp',
  ].join('\n'))
  const harness = makeHarness()

  try {
    const first = harness.createAgent(project)
    const second = harness.createAgent(project)
    await harness.preStep(first)
    await harness.preStep(second)
    assert.equal(harness.calls.length, 2)
    assert.match(harness.calls[0].config.serverName, /^idea-[0-9a-z]+-0$/)
    assert.match(harness.calls[1].config.serverName, /^idea-[0-9a-z]+-0$/)
    assert.notEqual(harness.calls[0].config.serverName, harness.calls[1].config.serverName)
    assert.equal(harness.errors.length, 0)
  } finally {
    harness.restore()
    await rm(project, { recursive: true, force: true })
  }
})

test('skips duplicate server names in one project configuration', async () => {
  const project = await makeProject([
    'servers:',
    '  - serverName: idea',
    '    transport: stdio',
    '    command: idea-a',
    '  - serverName: idea',
    '    transport: stdio',
    '    command: idea-b',
  ].join('\n'))
  const harness = makeHarness()

  try {
    const agent = harness.createAgent(project)
    await harness.preStep(agent)
    assert.equal(harness.calls.length, 1)
    assert.equal(harness.errors.length, 1)
    assert.match(harness.errors[0][0], /skipped duplicate serverName "idea"/)
  } finally {
    harness.restore()
    await rm(project, { recursive: true, force: true })
  }
})

test('keeps agent/pre-step running when MCP startup fails', async () => {
  const project = await makeProject([
    'servers:',
    '  - serverName: idea',
    '    transport: stdio',
    '    command: idea-mcp',
  ].join('\n'))
  const startupError = new Error('MCP server is offline')
  const harness = makeHarness({
    load: () => ({
      await: () => Promise.reject(startupError),
    }),
  })

  try {
    const agent = harness.createAgent(project)
    assert.equal(harness.calls.length, 1)
    assert.equal(harness.errors.length, 0)

    let nextCalls = 0
    const entered = harness.preStep(agent, () => {
      nextCalls += 1
      return 'entered'
    })
    assert.equal(nextCalls, 0)
    assert.equal(await entered, 'entered')
    assert.equal(nextCalls, 1)
    assert.equal(harness.errors.length, 1)
    assert.match(harness.errors[0][0], /failed to start server "idea"/)
    assert.equal(harness.errors[0][1], startupError)
  } finally {
    harness.restore()
    await rm(project, { recursive: true, force: true })
  }
})

test('logs an invalid server and still starts valid entries', async () => {
  const project = await makeProject([
    'servers:',
    '  - serverName: broken',
    '    transport: unsupported',
    '  - serverName: valid',
    '    transport: stdio',
    '    command: valid-mcp',
  ].join('\n'))
  const harness = makeHarness()

  try {
    const agent = harness.createAgent(project)
    await harness.preStep(agent)
    assert.equal(harness.calls.length, 1)
    assert.match(harness.calls[0].config.serverName, /^valid-[0-9a-z]+-1$/)
    assert.equal(harness.errors.length, 1)
    assert.match(harness.errors[0][0], /failed to load servers\[0\]/)
  } finally {
    harness.restore()
    await rm(project, { recursive: true, force: true })
  }
})

test('logs a malformed project configuration without affecting Agent creation', async () => {
  const project = await makeProject('mcpServers: {}\n')
  const harness = makeHarness()

  try {
    const agent = harness.createAgent(project)
    await harness.preStep(agent)
    assert.equal(harness.calls.length, 0)
    assert.equal(harness.errors.length, 1)
    assert.match(harness.errors[0][0], /failed to read MCP configuration/)
  } finally {
    harness.restore()
    await rm(project, { recursive: true, force: true })
  }
})

test('a project without mcp.yml remains untouched', async () => {
  const project = await mkdtemp(join(tmpdir(), 'dsh-project-mcp-'))
  const harness = makeHarness()
  try {
    const agent = harness.createAgent(project)
    await harness.preStep(agent)
    assert.equal(harness.calls.length, 0)
    assert.equal(harness.errors.length, 0)
  } finally {
    harness.restore()
    await rm(project, { recursive: true, force: true })
  }
})
