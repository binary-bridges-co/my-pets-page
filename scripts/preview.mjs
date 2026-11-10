// Serves dist/ locally the way Cloudflare Pages does (docs/DESIGN.md §10), for the browser tests and the
// header check: _headers rules with splats (a header set by two matching rules is joined with ", ", as
// Pages does), _redirects 200 rewrites, 404.html for anything else, and no redirects. Local only.
//   node scripts/preview.mjs [--port=4173] [--dir=dist]
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const port = Number(arg('port', '4173'));
const dir = fileURLToPath(new URL(`../${arg('dir', 'dist')}/`, import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '': 'application/octet-stream',
};

function pattern(path) {
  return new RegExp(`^${path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
}

function readRules(file, parse) {
  const path = join(dir, file);
  return existsSync(path) ? parse(readFileSync(path, 'utf8')) : [];
}

const headerRules = readRules('_headers', (text) => {
  const rules = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) rules.push({ match: pattern(line.trim()), headers: [] });
    else {
      const at = line.indexOf(':');
      rules.at(-1).headers.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
    }
  }
  return rules;
});

const rewrites = readRules('_redirects', (text) =>
  text
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const [from, to, status] = l.trim().split(/\s+/);
      if (status !== '200') throw new Error(`_redirects: only 200 rewrites are expected, got ${l}`);
      return { match: pattern(from), to };
    }),
);

function file(path) {
  const full = normalize(join(dir, path));
  if (!full.startsWith(dir)) return undefined;
  if (existsSync(full) && statSync(full).isFile()) return full;
  const index = join(full, 'index.html');
  return existsSync(index) ? index : undefined;
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let served = path.endsWith('/index.html') ? undefined : file(path);
  let status = 200;
  if (!served) {
    const rewrite = rewrites.find((r) => r.match.test(path));
    served = rewrite ? file(rewrite.to) : undefined;
  }
  if (!served) {
    status = 404;
    served = file('/404.html');
  }
  const headers = { 'Content-Type': TYPES[extname(served)] ?? 'application/octet-stream' };
  const custom = {};
  for (const rule of headerRules) {
    if (!rule.match.test(path)) continue;
    for (const [name, value] of rule.headers) custom[name] = custom[name] ? `${custom[name]}, ${value}` : value;
  }
  res.writeHead(status, { ...headers, ...custom });
  res.end(req.method === 'HEAD' ? undefined : readFileSync(served));
}).listen(port, '127.0.0.1', () => console.log(`preview: http://127.0.0.1:${port}/ serving ${dir}`));
