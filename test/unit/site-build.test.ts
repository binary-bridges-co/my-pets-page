// How the homepage joins the card build (plan § Architecture, Tokens, Indexing): Astro may not write a
// card path, telemetry is off before Astro loads, colours come only from the pinned tokens, and a
// normal dist/ carries no fixture. Runs from the repository root (npm test).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { FIXTURE_DIR, FIXTURE_ID } from '../../site/src/config/launch';
import { HOME_CSP, metaCsp } from '../../site/src/lib/csp';
import { themeColors } from '../../site/src/lib/tokens';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test('Astro writes no path the card build owns', () => {
  const reserved = ['404.html', '404.astro', '404.md', 'p', 'assets', '.well-known', '_headers', '_redirects', '.nojekyll', FIXTURE_DIR];
  for (const dir of ['site/public', 'site/src/pages']) {
    const top = readdirSync(join(root, dir));
    for (const name of reserved) assert.ok(!top.includes(name), `${dir}/${name} would collide with the card build`);
    for (const name of top) assert.ok(!/^404\./.test(name) && !/^index\.html$/.test(name), `${dir}/${name}`);
  }
});

test('telemetry is off before Astro is imported, and in every script that runs astro', () => {
  const build = read('scripts/build.mjs');
  const off = build.indexOf("process.env.ASTRO_TELEMETRY_DISABLED = '1'");
  const load = build.indexOf("import('astro')");
  assert.ok(off > 0, 'build.mjs turns telemetry off');
  assert.ok(load > off, 'build.mjs imports astro dynamically, after turning telemetry off');
  assert.ok(!/^import .* from 'astro'/m.test(build), 'no static astro import (it would run first)');
  const scripts = (JSON.parse(read('package.json')) as { scripts: Record<string, string> }).scripts;
  const calls = Object.entries(scripts).filter(([, s]) => /(^|\s|&&\s*)astro\s/.test(s));
  assert.ok(calls.length > 0);
  for (const [name, s] of calls) assert.match(s, /ASTRO_TELEMETRY_DISABLED=1 astro\s/, name);
});

test('no colour outside the pinned tokens: no hex, no named white or black in site/src', () => {
  for (const file of walk(join(root, 'site/src'))) {
    if (file.endsWith(join('styles', 'tokens.css'))) continue;
    const text = readFileSync(file, 'utf8');
    assert.ok(!/#[0-9a-fA-F]{3,8}\b(?![-\w])/.test(text.replace(/href="#[\w-]+"|id="[\w-]+"|#[\w-]*[g-zG-Z_][\w-]*/g, '')), `hex colour in ${file}`);
    if (/\.(css|astro)$/.test(file)) assert.ok(!/(:|,|\()\s*(white|black)\b/.test(text), `named colour in ${file}`);
  }
});

test('theme-color is read from the pinned tokens: the paper of each theme', () => {
  const css = read('site/src/styles/tokens.css');
  assert.deepEqual(themeColors(css), { light: '#fbfaf8', dark: '#16192b' });
  assert.throws(() => themeColors('@theme { }'), /color-paper/);
});

test("Apple's badges are the downloaded files, unaltered (site/BADGES_SOURCE)", () => {
  const lines = read('site/BADGES_SOURCE').trim().split('\n');
  assert.ok(lines.length >= 3);
  for (const line of lines) {
    const [url, sha, local] = line.split(' ');
    assert.match(url ?? '', /^https:\/\/(toolbox\.marketingtools\.apple\.com|developer\.apple\.com)\//);
    const got = createHash('sha256').update(readFileSync(join(root, local ?? ''))).digest('hex');
    assert.equal(`sha256=${got}`, sha, local);
  }
});

test('check-no-fixture looks for the same folder and id as the config', () => {
  const script = read('scripts/check-no-fixture.mjs');
  assert.ok(script.includes(`const FIXTURE_DIR = '${FIXTURE_DIR}';`));
  assert.ok(script.includes(`const FIXTURE_ID = '${FIXTURE_ID}';`));
});

test('check-no-fixture: a clear failure without dist/, on a fixture build, or with the fixture id; a pass otherwise', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'no-fixture-'));
  const run = (dir: string) => spawnSync(process.execPath, [join(root, 'scripts/check-no-fixture.mjs'), `--dir=${dir}`], { encoding: 'utf8' });
  try {
    const missing = run(join(tmp, 'nothing'));
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /run `npm run build` first/);

    const clean = join(tmp, 'clean');
    mkdirSync(clean);
    writeFileSync(join(clean, 'index.html'), '<h1>My Pets</h1>');
    const ok = run(clean);
    assert.equal(ok.status, 0, ok.stderr);

    const fixture = join(tmp, 'fixture');
    mkdirSync(join(fixture, FIXTURE_DIR), { recursive: true });
    writeFileSync(join(fixture, 'index.html'), '<h1>My Pets</h1>');
    const built = run(fixture);
    assert.notEqual(built.status, 0);
    assert.match(built.stderr, /fixture build/);

    const leaked = join(tmp, 'leaked');
    mkdirSync(leaked);
    writeFileSync(join(leaked, 'index.html'), `<meta name="apple-itunes-app" content="app-id=${FIXTURE_ID}">`);
    const id = run(leaked);
    assert.notEqual(id.status, 0);
    assert.match(id.stderr, /index\.html/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('the homepage CSP is one string: the layout, _headers for / and /press, and check-headers agree', () => {
  const headers = read('src/host/_headers');
  for (const path of ['/', '/press']) {
    const rule = headers.split(/\n(?=\S)/).find((r) => r.startsWith(`${path}\n`)) ?? '';
    assert.ok(rule.includes('! Content-Security-Policy') && rule.includes('! X-Robots-Tag'), `${path} detaches the card CSP and noindex`);
    assert.ok(rule.includes(`Content-Security-Policy: ${HOME_CSP}\n`), `${path} sets the homepage CSP`);
  }
  const check = read('scripts/check-headers.mjs');
  const quoted = /const HOME_CSP =\n([\s\S]*?);\n/.exec(check)?.[1] ?? '';
  assert.equal(quoted.split('\n').map((l) => l.trim().replace(/^"|"( \+)?$/g, '')).join(''), HOME_CSP);
  assert.ok(!metaCsp().includes('frame-ancestors'), 'a meta CSP cannot carry frame-ancestors');
  assert.match(HOME_CSP, /script-src 'none'/);
});
