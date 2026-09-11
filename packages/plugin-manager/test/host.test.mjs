import assert from 'node:assert/strict'
import test from 'node:test'

import { apply, inject, listPlugins, parseRequest, redact } from '../dist/host.js'

function createContext(captured, outcome = { exitCode: 1, signal: null }, output = {
  stdout: 'stdout\n',
  stderr: 'ERR_PNPM_PACKAGE_MANAGER_ADD_RESOLVE_GIT\n',
}) {
  let handler
  const context = {
    connection: {
      rpc: {
        handle(channel, next) {
          captured.channel = channel
          handler = next
          return async () => {}
        },
      },
    },
    subprocess: {
      async resolveExecutable(command) {
        captured.resolved = command
        return '/absolute/dsh'
      },
      spawn(spec) {
        captured.spec = spec
        return {
          collected: {
            stdout: { readFrom: () => ({ text: output.stdout, lossy: false }) },
            stderr: { readFrom: () => ({ text: output.stderr, lossy: false }) },
          },
          done: Promise.resolve(outcome),
        }
      },
    },
    effect(effect) {
      effect()
    },
    inject(names, callback) {
      captured.webInject = names
      callback(context)
    },
  }
  apply(context)
  return handler
}

test('injects webServer where Connection registers its HTTP route', () => {
  assert.deepEqual(inject, ['connection', 'subprocess'])
  const captured = {}
  createContext(captured)
  assert.deepEqual(captured.webInject, ['webServer'])
})

test('rejects invalid operation input', () => {
  assert.throws(() => parseRequest({ operation: 'add', spec: '   ' }), /spec must be a non-empty string/)
  assert.throws(() => parseRequest({ operation: 'remove', name: '' }), /name must be a non-empty string/)
  assert.throws(() => parseRequest({ operation: 'run', value: 'anything' }), /operation must be add or remove/)
})

test('projects only installed DSH bundles', () => {
  const installed = {
    'dsh-plugin-manager': { version: '0.1.5', dsh: { bundle: { patch: './cordis.patch.yml' } } },
    'dsh-example': { version: '1.2.3', dsh: { bundle: { patch: './cordis.patch.yml' } } },
    lodash: { version: '4.0.0' },
  }
  assert.deepEqual(listPlugins({ dependencies: {
    'dsh-plugin-manager': 'github:example/manager#v1',
    'dsh-example': 'github:example/repo#v2&path:packages/example',
    lodash: '^4.0.0',
  } }, name => installed[name]), [
    {
      name: 'dsh-plugin-manager',
      version: '0.1.5',
      source: 'github:example/manager',
      spec: 'github:example/manager#v1',
      status: 'installed',
      specRedacted: false,
      self: true,
    },
    {
      name: 'dsh-example',
      version: '1.2.3',
      source: 'github:example/repo',
      spec: 'github:example/repo#v2&path:packages/example',
      status: 'installed',
      specRedacted: false,
      self: false,
    },
  ])
})

test('does not spawn a command to remove the manager itself', async () => {
  const captured = {}
  const handler = createContext(captured)
  const result = await handler('operate', { operation: 'remove', name: 'dsh-plugin-manager' }, new AbortController().signal)
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'self-remove-denied')
  assert.equal('spec' in captured, false)
})

test('uses fixed argv and keeps CLI diagnostics', async () => {
  const captured = {}
  const handler = createContext(captured)
  const spec = "abc'; echo unsafe; &path:packages/test"
  const result = await handler('operate', { operation: 'add', spec }, new AbortController().signal)

  assert.equal(result.ok, true)
  assert.equal(result.value.ok, false)
  assert.equal(captured.channel, '/dsh-plugin-manager')
  assert.deepEqual(captured.spec.argv, ['/absolute/dsh', 'plugin', '--profile', 'web', 'add', spec])
  assert.equal('shell' in captured.spec, false)
  assert.match(result.value.result.output, /ERR_PNPM_PACKAGE_MANAGER_ADD_RESOLVE_GIT/)
})

test('returns only the operation result after a successful CLI run', async () => {
  const handler = createContext({}, { exitCode: 0, signal: null })
  const result = await handler('operate', { operation: 'add', spec: 'github:example/plugin' }, new AbortController().signal)

  assert.equal(result.ok, true)
  assert.equal(result.value.ok, true)
  assert.ok(result.value.result)
  assert.equal('state' in result.value, false)
})

test('redacts credentials and identity fields before returning plugin state or output', () => {
  const value = 'https://alice:secret@example.com/repo#v1 Bearer abc123 access_token=xyz email=alice@example.com contact alice@example.com "refresh_token":"refresh-secret" "account_id":"account-secret"'
  const safe = redact(value)

  assert.doesNotMatch(safe, /secret|abc123|xyz|alice@example\.com/)
  assert.match(safe, /<redacted>/)
  assert.match(safe, /<redacted-email>/)

  const [plugin] = listPlugins({ dependencies: {
    'dsh-private': 'https://alice:secret@example.com/repo#v1',
  } }, () => ({ version: '1.0.0', dsh: { bundle: { patch: './cordis.patch.yml' } } }))
  assert.equal(plugin.spec, 'https://<redacted>@example.com/repo#v1')
  assert.equal(plugin.source, 'https://<redacted>@example.com/repo')
  assert.equal(plugin.specRedacted, true)
})

test('redacts CLI diagnostics returned through the RPC result', async () => {
  const handler = createContext({}, { exitCode: 1, signal: null }, {
    stdout: 'Bearer output-secret email=alice@example.com\n',
    stderr: 'account_id=account-secret\n',
  })
  const result = await handler('operate', { operation: 'add', spec: 'github:example/plugin' }, new AbortController().signal)

  assert.equal(result.value.ok, false)
  assert.doesNotMatch(result.value.result.output, /output-secret|alice@example\.com|account-secret/)
})
