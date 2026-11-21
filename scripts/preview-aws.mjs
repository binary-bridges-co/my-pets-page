// Serves dist/ locally the way the AWS host does (docs/DESIGN.md §10), from the same model the CloudFormation
// blocks are rendered from (scripts/aws/host.mjs): the first cache behaviour whose path pattern matches,
// its viewer-request function (the generated code itself, run in a VM), the S3 object with the content type
// the deploy uploads it with, the distribution's 404 page (status 404) for a missing object, and the
// behaviour's response headers policy over every answer. Local only; npm run check:aws runs
// scripts/check-headers.mjs against it.
//   node scripts/preview-aws.mjs [--port=4175]
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { hostModel } from './aws/host.mjs';

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const port = Number(arg('port', '4175'));
const dist = new URL('../dist/', import.meta.url);
const host = hostModel(dist);

/** CloudFront path patterns: `*` any characters, `?` exactly one. */
const glob = (pattern) => new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
const behaviors = host.model.behaviors.map((b) => ({ ...b, match: glob(b.pathPattern) }));
const handler = vm.runInNewContext(`${host.code}\n;handler`, {});
const objects = new Map(host.plan.map((o) => [o.key, o]));
const policies = new Map(host.model.policies.map((p) => [p.slug, p.set]));

function querystring(search) {
  const qs = {};
  for (const [name, value] of new URLSearchParams(search)) {
    if (qs[name]) qs[name] = { value: qs[name].value, multiValue: [...(qs[name].multiValue ?? [qs[name]]), { value }] };
    else qs[name] = { value };
  }
  return qs;
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const behavior = behaviors.find((b) => b.match.test(url.pathname)) ?? host.model.defaultBehavior;
  const policy = policies.get(behavior.policy);
  const send = (status, headers, body) => {
    for (const name of policy.removed) delete headers[name.toLowerCase()];
    for (const [name, value] of policy.headers) if (name.toLowerCase() !== 'content-type') headers[name.toLowerCase()] = value;
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  let uri = url.pathname;
  if (behavior.functions) {
    const out = handler({ version: '1.0', context: { eventType: 'viewer-request' }, viewer: { ip: '127.0.0.1' }, request: { method: req.method, uri, querystring: querystring(url.search), headers: {}, cookies: {} } });
    if (out.statusCode) {
      send(out.statusCode, Object.fromEntries(Object.entries(out.headers ?? {}).map(([n, v]) => [n, v.value])));
      return;
    }
    uri = out.uri;
  }
  let key;
  try {
    key = decodeURIComponent(uri).slice(1);
  } catch {
    key = '';
  }
  // S3 behind origin access control answers 403 for a missing key; the distribution turns 403 and 404 into /404.html with 404.
  const found = objects.get(key);
  const object = found ?? objects.get('404.html');
  const file = fileURLToPath(new URL(object.key, dist));
  const headers = { 'content-type': object.contentType };
  if (object.cacheControl) headers['cache-control'] = object.cacheControl;
  send(found ? 200 : 404, headers, existsSync(file) ? readFileSync(file) : undefined);
}).listen(port, '127.0.0.1', () => console.log(`preview-aws: http://127.0.0.1:${port}/ serving ${fileURLToPath(dist)} as CloudFront would`));
