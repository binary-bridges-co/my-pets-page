// Publishes the built dist/ to the AWS host (docs/RUNBOOK.md §2), with the credentials already in the
// environment (GitHub Actions: the OIDC deploy role). Refuses a dist/ whose generated CloudFront blocks
// differ from aws/cloudfront.generated.yml, since the live distribution would not route its pages.
//   node scripts/deploy-aws.mjs --bucket=<name> --distribution=<id> [--dry-run]
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { commands } from './aws/deploy.mjs';
import { GENERATED, hostModel } from './aws/host.mjs';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const dryRun = process.argv.includes('--dry-run');
const dist = fileURLToPath(new URL('../dist/', import.meta.url));

const host = hostModel();
if (host.text !== readFileSync(GENERATED, 'utf8')) {
  console.error('deploy-aws: aws/cloudfront.generated.yml is stale for this dist/: run npm run gen:aws and update bb-infrastructure first');
  process.exit(1);
}
const { uploads, prune, invalidate } = commands(host.plan, { dist, bucket: arg('bucket'), distribution: arg('distribution') });

function aws(args, capture = false) {
  console.log(`deploy-aws: aws ${args.map((a) => (/[\s*;]/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
  if (dryRun) return 'DRYRUN';
  const out = spawnSync('aws', args, { stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'], encoding: 'utf8' });
  if (out.status !== 0) {
    console.error(`deploy-aws: aws ${args[0]} ${args[1]} failed (${out.status ?? out.signal})`);
    process.exit(1);
  }
  return capture ? out.stdout.trim() : '';
}

for (const upload of uploads) aws(upload);
aws(prune);
const id = aws(invalidate, true);
aws(['cloudfront', 'wait', 'invalidation-completed', '--distribution-id', arg('distribution'), '--id', id]);
console.log(`deploy-aws: ${host.plan.length} objects in s3://${arg('bucket')}/, invalidation ${id} done${dryRun ? ' (dry run)' : ''}`);
