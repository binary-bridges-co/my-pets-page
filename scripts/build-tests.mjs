// Bundles test/unit/*.test.ts for Node (node:test), with the vendored Ed25519 in place of the package.
import { build } from 'esbuild';
import { readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const out = fileURLToPath(new URL('build/test/', root));
rmSync(out, { recursive: true, force: true });
const tests = readdirSync(new URL('test/unit/', root)).filter((f) => f.endsWith('.test.ts'));
await build({
  entryPoints: tests.map((f) => fileURLToPath(new URL(`test/unit/${f}`, root))),
  outdir: out,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  logLevel: 'warning',
  alias: { '@noble/ed25519': fileURLToPath(new URL('vendor/noble-ed25519/index.js', root)) },
  define: {
    __CLOUDKIT__: JSON.stringify({ containerId: 'iCloud.co.binarybridges.pets', environment: 'development', apiToken: 'TESTTOKEN' }),
  },
});
