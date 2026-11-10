// Runs check-headers.mjs against Cloudflare's own local emulation of Pages (`wrangler pages dev`, no
// account, nothing deployed), so the rewrite, the headers and the AASA are checked with Pages' rules
// as well as with scripts/preview.mjs. Local only: the pinned wrangler from node_modules, telemetry
// off, its state in a temporary folder.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 8788;
const base = `http://127.0.0.1:${port}`;

await new Promise((resolve, reject) => {
  const probe = createServer().once('error', () => reject(new Error(`check-pages: port ${port} is in use`)));
  probe.listen(port, '127.0.0.1', () => probe.close(resolve));
});

const state = mkdtempSync(join(tmpdir(), 'my-pets-wrangler-'));
const wrangler = spawn(join(root, 'node_modules/.bin/wrangler'), ['pages', 'dev', 'dist', '--port', String(port), '--ip', '127.0.0.1', '--persist-to', state], {
  cwd: root,
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_API_TOKEN: '' },
  stdio: ['ignore', 'ignore', 'inherit'],
  detached: true,
});
let exited = false;
wrangler.once('exit', () => {
  exited = true;
});

function stop() {
  if (!exited) {
    try {
      process.kill(-wrangler.pid, 'SIGTERM');
    } catch {}
  }
  rmSync(state, { recursive: true, force: true });
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    stop();
    process.exit(1);
  });
}

let code = 1;
try {
  let ready = false;
  for (let i = 0; i < 120 && !exited && !ready; i++) {
    ready = await fetch(`${base}/`).then(
      () => true,
      () => false,
    );
    if (!ready) await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error('check-pages: wrangler pages dev did not start');
  code = await new Promise((resolve) => {
    spawn(process.execPath, [fileURLToPath(new URL('check-headers.mjs', import.meta.url)), base], { stdio: 'inherit' }).on('exit', (c, signal) =>
      resolve(signal ? 1 : (c ?? 1)),
    );
  });
} finally {
  stop();
  // Give workerd a moment, then make sure the group is gone.
  await new Promise((r) => setTimeout(r, 1500));
  try {
    process.kill(-wrangler.pid, 'SIGKILL');
  } catch {}
}
process.exit(code);
