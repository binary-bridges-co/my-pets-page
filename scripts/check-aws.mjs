// Runs check-headers.mjs, unchanged, against scripts/preview-aws.mjs: the generated CloudFront behaviours,
// response headers policies and viewer-request function over the built dist/, so the AWS host is checked
// with the same contract as the local preview and wrangler pages dev. Also fails if
// aws/cloudfront.generated.yml is stale. --launch=fixture passes through.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = (name) => fileURLToPath(new URL(name, import.meta.url));
const stale = spawnSync(process.execPath, [script('gen-aws.mjs'), '--check'], { stdio: 'inherit' });
if (stale.status !== 0) process.exit(1);

const port = 4175;
const server = spawn(process.execPath, [script('preview-aws.mjs'), `--port=${port}`], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  server.stdout.once('data', resolve);
  server.once('exit', reject);
});
const code = await new Promise((resolve) => {
  spawn(process.execPath, [script('check-headers.mjs'), `http://127.0.0.1:${port}`, ...process.argv.slice(2)], { stdio: 'inherit' }).on('exit', (c, signal) =>
    resolve(signal ? 1 : (c ?? 1)),
  );
});
server.kill();
process.exit(code);
