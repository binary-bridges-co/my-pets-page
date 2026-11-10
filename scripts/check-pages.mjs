// Runs check-headers.mjs against Cloudflare's own local emulation of Pages (`wrangler pages dev`, no
// account, nothing deployed), so the rewrite, the headers and the AASA are checked with Pages' rules
// as well as with scripts/preview.mjs. Local only; wrangler's telemetry is off.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = 8788;
const base = `http://127.0.0.1:${port}`;
const wrangler = spawn('npx', ['wrangler', 'pages', 'dev', 'dist', '--port', String(port), '--ip', '127.0.0.1'], {
  cwd: root,
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_API_TOKEN: '' },
  stdio: ['ignore', 'ignore', 'inherit'],
  detached: true,
});
let code = 1;
try {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`${base}/`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  code = await new Promise((resolve) => {
    spawn(process.execPath, [fileURLToPath(new URL('check-headers.mjs', import.meta.url)), base], { stdio: 'inherit' }).on('exit', resolve);
  });
} finally {
  process.kill(-wrangler.pid, 'SIGTERM');
}
process.exit(code);
