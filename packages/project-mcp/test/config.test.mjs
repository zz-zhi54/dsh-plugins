import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  projectMcpFile,
  readProjectMcpEntries,
  resolveProjectMcpEntry,
} from '../src/config.mjs'

test('missing project MCP file is an empty configuration', async () => {
  const project = await mkdtemp(join(tmpdir(), 'dsh-project-mcp-'))
  try {
    assert.deepEqual(readProjectMcpEntries(project), [])
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})

test('reads the existing MCP client shape from .dsh/mcp.yml', async () => {
  const project = await mkdtemp(join(tmpdir(), 'dsh-project-mcp-'))
  try {
    await mkdir(join(project, '.dsh'))
    await writeFile(projectMcpFile(project), [
      'servers:',
      '  - serverName: idea',
      '    transport: stdio',
      '    command: idea-mcp',
      '    args: [--stdio]',
    ].join('\n'))

    const entries = readProjectMcpEntries(project)
    assert.equal(entries.length, 1)
    assert.equal(entries[0].serverName, 'idea')
    assert.deepEqual(entries[0].args, ['--stdio'])
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})

test('requires a top-level servers array', async () => {
  const project = await mkdtemp(join(tmpdir(), 'dsh-project-mcp-'))
  try {
    await mkdir(join(project, '.dsh'))
    await writeFile(projectMcpFile(project), 'mcpServers: {}\n')
    assert.throws(() => readProjectMcpEntries(project), /top-level "servers" array/)
  } finally {
    await rm(project, { recursive: true, force: true })
  }
})

test('resolves stdio cwd relative to the Session project cwd', () => {
  const project = '/Projects/a'
  assert.equal(
    resolveProjectMcpEntry({
      serverName: 'idea',
      transport: 'stdio',
      command: 'idea-mcp',
    }, project).cwd,
    project,
  )
  assert.equal(
    resolveProjectMcpEntry({
      serverName: 'idea',
      transport: 'stdio',
      command: 'idea-mcp',
      cwd: 'tools',
    }, project).cwd,
    '/Projects/a/tools',
  )
})

test('invalid entries fail independently with an indexed diagnostic', () => {
  assert.throws(
    () => resolveProjectMcpEntry({ transport: 'stdio', command: 'bad' }, '/Projects/a', 2),
    /servers\[2\]\.serverName is required/,
  )
  assert.throws(
    () => resolveProjectMcpEntry({ serverName: 'bad', transport: 'unknown' }, '/Projects/a', 1),
    /servers\[1\]\.transport must be/,
  )
})
