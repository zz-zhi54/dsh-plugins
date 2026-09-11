import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    name: 'dsh-plugin-manager/host',
    entry: 'src/host.ts',
    outDir: 'dist',
    format: ['esm'],
    platform: 'node',
    target: 'es2022',
    fixedExtension: false,
    dts: false,
    clean: true,
  },
  {
    name: 'dsh-plugin-manager/client',
    entry: { client: 'src/client.ts' },
    outDir: 'dist',
    format: ['cjs'],
    platform: 'browser',
    target: 'es2022',
    dts: false,
    clean: false,
    fixedExtension: false,
    deps: { neverBundle: ['react'] },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: "window.__ModuleLoader__.load({ id: 'dsh-plugin-manager', factory: (require) => {",
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
