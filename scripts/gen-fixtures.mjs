// Writes test/fixtures/scenarios.json from test/support/scenarios.ts (`npm run fixtures`). Ed25519
// signatures are deterministic, so the file only changes when the scenarios do.
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const out = await build({
  stdin: { contents: "import { scenarios } from './test/support/scenarios'; export default scenarios;", resolveDir: fileURLToPath(root), loader: 'ts' },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  alias: { '@noble/ed25519': fileURLToPath(new URL('vendor/noble-ed25519/index.js', root)) },
});
const module = await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
const json = `${JSON.stringify(await module.default(), null, 1)}\n`;
writeFileSync(new URL('test/fixtures/scenarios.json', root), json);
console.log(`fixtures: test/fixtures/scenarios.json (${json.length} bytes)`);
