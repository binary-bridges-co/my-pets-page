// Serves dist/ locally the way Cloudflare Pages does (docs/DESIGN.md §10), for the browser tests and the
// header check: _headers rules with splats, applied in order, each removing its `! Name` headers first and
// then setting its own (a header set by two rules and never removed is joined with ", ", as Pages does);
// _redirects 200 rewrites; Pages' clean URLs (/press serves press.html; /press.html, /press/ and
// /index.html redirect with 308 to the clean path); 404.html for anything else. Local only. The order
// follows wrangler's own Pages emulation (generateResponse and attachHeaders in wrangler-dist/cli.js).
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
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
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
    if (!/^\s/.test(line)) rules.push({ match: pattern(line.trim()), headers: [], detach: [] });
    else if (line.trim().startsWith('!')) rules.at(-1).detach.push(line.trim().slice(1).trim());
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

function asset(path) {
  const full = normalize(join(dir, path));
  if (!full.startsWith(dir)) return undefined;
  return existsSync(full) && statSync(full).isFile() ? full : undefined;
}

/** Pages' answer for a path: a file to serve, a 308 to a clean path, or the 404 page. */
function resolve(requested) {
  const rewrite = rewrites.find((r) => r.match.test(requested));
  const path = rewrite ? rewrite.to : requested;
  const serve = (file) => ({ status: 200, file });
  const redirect = (location) => ({ status: 308, location });
  const notFound = { status: 404, file: asset('/404.html') };
  if (path.endsWith('/')) {
    if (asset(`${path}index.html`)) return serve(asset(`${path}index.html`));
    if (path.endsWith('/index/')) return redirect(path.slice(0, -'index/'.length));
    if (asset(path.replace(/\/$/, '.html'))) return redirect(path.slice(0, -1));
    return notFound;
  }
  if (asset(path)) {
    if (!path.endsWith('.html')) return serve(asset(path));
    const clean = path.slice(0, -'.html'.length);
    if (clean.endsWith('/index')) return redirect(clean.replace(/\/index$/, '/'));
    return asset(clean) ? serve(asset(path)) : redirect(clean);
  }
  if (path.endsWith('/index')) return redirect(path.slice(0, -'index'.length));
  if (asset(`${path}.html`)) return serve(asset(`${path}.html`));
  if (asset(`${path}/index.html`)) return redirect(`${path}/`);
  return notFound;
}

createServer((req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const answer = resolve(path);
  const headers = answer.location ? { Location: answer.location } : { 'Content-Type': TYPES[extname(answer.file)] ?? 'application/octet-stream' };
  // Pages adds Access-Control-Allow-Origin: * to every static file unless a rule detaches it with `! Name`.
  const custom = { 'Access-Control-Allow-Origin': '*' };
  for (const rule of headerRules) {
    if (!rule.match.test(path)) continue;
    for (const name of rule.detach) delete custom[name];
    for (const [name, value] of rule.headers) custom[name] = custom[name] ? `${custom[name]}, ${value}` : value;
  }
  res.writeHead(answer.status, { ...headers, ...custom });
  res.end(req.method === 'HEAD' || !answer.file ? undefined : readFileSync(answer.file));
}).listen(port, '127.0.0.1', () => console.log(`preview: http://127.0.0.1:${port}/ serving ${dir}`));
