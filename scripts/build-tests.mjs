// Bundles test/unit/*.test.ts for Node (node:test), with the vendored Ed25519 in place of the package.
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const out = new URL('build/test/', root).pathname;
rmSync(out, { recursive: true, force: true });
const tests = readdirSync(new URL('test/unit/', root)).filter((f) => f.endsWith('.test.ts'));
await build({
  entryPoints: tests.map((f) => new URL(`test/unit/${f}`, root).pathname),
  outdir: out,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  logLevel: 'warning',
  alias: { '@noble/ed25519': new URL('vendor/noble-ed25519/index.js', root).pathname },
  define: {
    __CLOUDKIT__: JSON.stringify({ containerId: 'iCloud.co.binarybridges.pets', environment: 'development', apiToken: 'TESTTOKEN' }),
  },
});
