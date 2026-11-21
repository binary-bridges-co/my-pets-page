// The AWS host (CloudFront in front of a private S3 bucket, docs/DESIGN.md §10), derived from the same
// src/host/_headers and src/host/_redirects that Cloudflare Pages reads, so the two can't drift:
// - every _headers rule becomes a CloudFront cache behaviour whose response headers policy carries the
//   headers Pages would send for that path (rules applied in order, `! Name` detaching, as in
//   scripts/preview.mjs). A response headers policy also covers the 404 answer, which a viewer-response
//   function would not (CloudFront skips those for status 400 and higher);
// - Content-Type in _headers becomes the S3 object's content type (set at upload, scripts/deploy-aws.mjs);
// - _redirects (200 rewrites only) and Pages' clean URLs become the viewer-request function
//   (scripts/aws/viewer-request.js).
// Pure functions only: scripts/aws/render.mjs writes the CloudFormation blocks, scripts/gen-aws.mjs the file.
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** The pattern syntax Pages and CloudFront share: a literal path, or `*` for any characters. */
function checkPattern(pattern, what) {
  if (!pattern.startsWith('/')) throw new Error(`${what}: ${pattern} does not start with /`);
  if (/[?:\s]/.test(pattern)) throw new Error(`${what}: ${pattern} uses syntax CloudFront path patterns can't express`);
}

export function patternRegex(pattern) {
  return new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
}

/** _headers: `[{ pattern, detach: [name], set: [[name, value]] }]`, in file order. */
export function parseHeaders(text) {
  const rules = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      checkPattern(line.trim(), '_headers');
      rules.push({ pattern: line.trim(), detach: [], set: [] });
    } else if (rules.length === 0) throw new Error(`_headers: header before any path: ${line}`);
    else if (line.trim().startsWith('!')) rules.at(-1).detach.push(line.trim().slice(1).trim());
    else {
      const at = line.indexOf(':');
      if (at < 0) throw new Error(`_headers: not a header: ${line}`);
      rules.at(-1).set.push([line.slice(0, at).trim(), line.slice(at + 1).trim()]);
    }
  }
  return rules;
}

/** _redirects: only 200 rewrites (`/from/*  /to/  200`), as scripts/preview.mjs accepts. */
export function parseRewrites(text) {
  return text
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => {
      const [from, to, status] = l.trim().split(/\s+/);
      if (status !== '200') throw new Error(`_redirects: only 200 rewrites are expected, got ${l}`);
      checkPattern(from, '_redirects');
      if (!to?.startsWith('/') || to.includes('*')) throw new Error(`_redirects: target ${to} must be a plain path`);
      return { from, to };
    });
}

/**
 * The headers Pages sends for one path: every matching rule in order removes its `! Name` headers, then
 * sets its own (a header set twice and never removed is joined with ", "). `removed` lists the detached
 * headers no later rule sets again; Pages' own default (Access-Control-Allow-Origin) is one.
 */
export function effective(rules, path) {
  const headers = new Map();
  const removed = new Set();
  for (const rule of rules) {
    if (!patternRegex(rule.pattern).test(path)) continue;
    for (const name of rule.detach) {
      headers.delete(name.toLowerCase());
      removed.add(name);
    }
    for (const [name, value] of rule.set) {
      const key = name.toLowerCase();
      const prior = headers.get(key);
      headers.set(key, { name, value: prior ? `${prior.value}, ${value}` : value });
      for (const r of removed) if (r.toLowerCase() === key) removed.delete(r);
    }
  }
  return { headers: [...headers.values()].map(({ name, value }) => [name, value]), removed: [...removed] };
}

const canonical = (set) => JSON.stringify(set);

/** What a response headers policy must send for a path: Pages' headers but Content-Type, the S3 object's own. */
export function policyHeaders(rules, path) {
  const set = effective(rules, path);
  return { headers: set.headers.filter(([n]) => n.toLowerCase() !== 'content-type'), removed: set.removed };
}

/** A stable, readable slug for a behaviour's policy. */
function slug(pattern) {
  if (pattern === '/' || pattern === '*') return 'home';
  if (pattern === '/?*') return 'default';
  return pattern
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// CloudFront's default quotas: 25 cache behaviours per distribution, 20 response headers policies per account.
export const MAX_BEHAVIORS = 25;
export const MAX_POLICIES = 20;

/**
 * The distribution's cache behaviours, first match wins:
 * - one per _headers rule other than `/*`, literal paths first (file order), then splats, longest first;
 *   a splat must get the same headers for every path under it, or CloudFront can't express it;
 * - `/?*` for every other path except `/` (the `?` needs at least one character): the `/*` headers only,
 *   which is also what the 404 page gets;
 * - the default (`*`), which then only ever sees `/`.
 * Pages merges every matching rule, CloudFront picks one behaviour per path, so the model is then checked
 * on sample paths built from the rules' own patterns and words: each must get from its first matching
 * behaviour exactly what Pages sends it. A check on samples, not a proof; the rules here are simple.
 * `functions` is false for behaviours that only serve files (no rewrite or clean URL can apply).
 */
export function model(rules, rewrites, pages) {
  const named = rules.filter((r) => r.pattern !== '/*');
  const literal = named.filter((r) => !r.pattern.includes('*'));
  const splat = named.filter((r) => r.pattern.includes('*')).sort((a, b) => b.pattern.length - a.pattern.length);
  const seen = new Set();
  const behaviors = [];
  const probe = (pattern, fill) => pattern.replace(/\*/g, fill);
  for (const rule of [...literal, ...splat]) {
    if (seen.has(rule.pattern)) throw new Error(`_headers: ${rule.pattern} appears twice`);
    seen.add(rule.pattern);
    const set = policyHeaders(rules, probe(rule.pattern, 'probe/x.y'));
    if (rule.pattern.includes('*') && canonical(policyHeaders(rules, probe(rule.pattern, ''))) !== canonical(set)) {
      throw new Error(`_headers: ${rule.pattern} gives different headers to different paths under it`);
    }
    behaviors.push({ pathPattern: rule.pattern, set, functions: needsFunction(rule.pattern, rewrites, pages) });
  }
  const other = policyHeaders(rules, '/zz-no-rule-names-this-path');
  const unnamed = named.find((r) => patternRegex(r.pattern).test('/zz-no-rule-names-this-path'));
  if (unnamed) throw new Error(`_headers: ${unnamed.pattern} matches every path; only /* may`);
  const root = behaviors.find((b) => b.pathPattern === '/');
  const rest = behaviors.filter((b) => b.pathPattern !== '/');
  rest.push({ pathPattern: '/?*', set: other, functions: true });
  const defaultBehavior = { pathPattern: '*', set: root ? root.set : other, functions: true };
  if (rest.length > MAX_BEHAVIORS) throw new Error(`${rest.length} cache behaviours, CloudFront allows ${MAX_BEHAVIORS}`);
  checkSamples(rules, rest, defaultBehavior);

  const policies = [];
  const byKey = new Map();
  const policyOf = (behavior) => {
    const key = canonical(behavior.set);
    if (!byKey.has(key)) {
      const policy = { slug: slug(behavior.pathPattern), set: behavior.set };
      if (policies.some((p) => p.slug === policy.slug)) throw new Error(`two policies named ${policy.slug}`);
      byKey.set(key, policy);
      policies.push(policy);
    }
    return byKey.get(key).slug;
  };
  // The root first, so the homepage's policy is named "home" whichever page shares it.
  const defaultPolicy = policyOf(defaultBehavior);
  const ordered = rest.map((b) => ({ pathPattern: b.pathPattern, policy: policyOf(b), functions: b.functions }));
  if (policies.length > MAX_POLICIES) throw new Error(`${policies.length} response headers policies, CloudFront allows ${MAX_POLICIES}`);
  return { behaviors: ordered, defaultBehavior: { policy: defaultPolicy, functions: true }, policies };
}

/** Every sample path gets, from the first behaviour that matches it, the headers Pages would send it. */
function checkSamples(rules, behaviors, defaultBehavior) {
  const words = [...new Set(rules.flatMap((r) => r.pattern.split(/[/*]+/)).filter(Boolean))];
  const fills = ['', 'z', 'probe/x.y', ...words, ...words.map((w) => `z/${w}`)];
  const samples = new Set(['/']);
  for (const rule of rules) for (const fill of fills) samples.add(rule.pattern.replace(/\*/g, fill));
  const glob = (p) => new RegExp(`^${p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
  const matchers = behaviors.map((b) => ({ re: glob(b.pathPattern), b }));
  for (const path of samples) {
    if (!path.startsWith('/')) continue;
    const b = matchers.find((m) => m.re.test(path))?.b ?? defaultBehavior;
    if (canonical(b.set) !== canonical(policyHeaders(rules, path))) {
      throw new Error(`_headers: CloudFront picks one behaviour per path, and ${b.pathPattern} does not give ${path} what Pages sends it (overlapping rules)`);
    }
  }
}

/**
 * A behaviour needs the viewer-request function when a rewrite or one of Pages' clean-URL forms of an HTML
 * page (`/press`, `/press.html`, `/press/`; `/p/`, `/p`, `/p/index.html`) can arrive on it. The others only
 * serve files (`/_astro/*`, `/assets/*`, the AASA), and skip the function.
 */
function needsFunction(pattern, rewrites, pages) {
  const re = patternRegex(pattern);
  const sample = pattern.replace(/\*/g, 'x');
  if (rewrites.some((r) => patternRegex(r.from).test(sample) || re.test(r.from.replace(/\*/g, 'x')))) return true;
  return pages.some((page) => {
    const clean = page.replace(/\.html$/, '');
    const forms = [page, clean, `${clean}/`];
    if (clean.endsWith('/index')) forms.push(clean.slice(0, -'index'.length), clean.slice(0, -'/index'.length) || '/');
    return forms.some((f) => re.test(f));
  });
}

// Content types by extension; the one extensionless file (the AASA) takes its type from _headers.
export const TYPES = {
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
};

// Host files for Cloudflare Pages and GitHub Pages: built, never uploaded to S3.
export const NOT_UPLOADED = ['_headers', '_redirects', '.nojekyll'];

/** The address a visitor uses for an object: `press.html` is served at /press, `p/index.html` at /p/. */
export function servedAt(key) {
  if (key === 'index.html') return '/';
  if (key.endsWith('/index.html')) return `/${key.slice(0, -'index.html'.length)}`;
  if (key.endsWith('.html')) return `/${key.slice(0, -'.html'.length)}`;
  return `/${key}`;
}

/** Every object to upload: key, content type and Cache-Control (from _headers at the address it's served at). */
export function uploadPlan(keys, rules) {
  return keys
    .filter((key) => !NOT_UPLOADED.includes(key))
    .sort()
    .map((key) => {
      const set = new Map(effective(rules, servedAt(key)).headers.map(([n, v]) => [n.toLowerCase(), v]));
      const ext = /\.[a-z0-9]+$/.exec(key)?.[0] ?? '';
      const contentType = set.get('content-type') ?? TYPES[ext];
      if (!contentType) throw new Error(`${key}: no content type (extension "${ext}" is unknown and _headers sets none)`);
      return { key, contentType, cacheControl: set.get('cache-control') ?? null };
    });
}

/** Every file under dir, as S3 keys (forward slashes). */
export function listKeys(dir) {
  const walk = (d) =>
    readdirSync(d).flatMap((name) => {
      const full = join(d, name);
      return statSync(full).isDirectory() ? walk(full) : [relative(dir, full).split(sep).join('/')];
    });
  return walk(dir).sort();
}

/** The HTML files the viewer-request function routes to, as paths (`/press.html`). */
export function htmlPages(keys) {
  return keys.filter((k) => k.endsWith('.html')).map((k) => `/${k}`).sort();
}
