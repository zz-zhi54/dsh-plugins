import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../src/client.ts', import.meta.url), 'utf8')
const bundle = readFileSync(new URL('../dist/client.js', import.meta.url), 'utf8')

test('uses official DSH client types and the documented ctx.slots contract', () => {
  assert.match(source, /Context as ClientContext/)
  assert.match(source, /dsh-client-ui-renderer\/client/)
  assert.match(source, /dsh-client-ui-settings-plugins\/client/)
  assert.match(source, /export const inject = \['slots', 'connection'\]/)
  assert.match(source, /ctx\.slots\.inject\('settings\.plugins\.tab'/)
  assert.match(source, /ctx\.slots\.register\(/)
  assert.match(source, /connection\.rpc\.call\(CHANNEL/)
  assert.doesNotMatch(source, /function rpc/)
  assert.doesNotMatch(source, /fetch\(/)
})

test('builds the browser entry as a DSH client module', () => {
  assert.match(bundle, /window\.__ModuleLoader__\.load\(/)
  assert.match(bundle, /id: ["']dsh-plugin-manager["']/)
  assert.match(bundle, /factory: \(require\) =>/)
})
