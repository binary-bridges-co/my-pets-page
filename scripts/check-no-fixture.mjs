// A normal dist/ (what Cloudflare Pages deploys) carries nothing of the launch fixture: no dist/fixture/
// folder and no fixture App Store id in any file. CI runs it after the last normal build.
//   node scripts/check-no-fixture.mjs [--dir=dist]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Kept in step with site/src/config/launch.ts (FIXTURE_DIR, FIXTURE_ID) by test/unit/site-build.test.ts.
const FIXTURE_DIR = 'fixture';
const FIXTURE_ID = '6799990001';

const root = fileURLToPath(new URL('../', import.meta.url));
const dirArg = process.argv.find((a) => a.startsWith('--dir='))?.slice('--dir='.length);
const dir = resolve(root, dirArg ?? 'dist');

function fail(message) {
  console.error(`check-no-fixture: ${message}`);
  process.exit(1);
}

if (!existsSync(dir) || !statSync(dir).isDirectory()) fail(`${dir} is missing: run \`npm run build\` first`);
if (existsSync(join(dir, FIXTURE_DIR))) fail(`${dir} is a fixture build (it has ${FIXTURE_DIR}/): run \`npm run build\` for the normal one`);

function walk(path) {
  return readdirSync(path).flatMap((name) => {
    const full = join(path, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const files = walk(dir);
if (files.length === 0) fail(`${dir} is empty: run \`npm run build\` first`);
const leaks = files.filter((f) => readFileSync(f).includes(FIXTURE_ID) || readFileSync(f).includes('ct=fixture'));
if (leaks.length > 0) fail(`fixture data in ${leaks.map((f) => relative(dir, f)).join(', ')}`);
console.log(`check-no-fixture: ${files.length} files in ${relative(root, dir) || dir}, no fixture`);
