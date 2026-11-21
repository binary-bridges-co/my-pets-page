// The AWS CLI commands that publish dist/ (docs/RUNBOOK.md §2), as argument arrays (no shell):
// 1. upload every object with its content type and Cache-Control, one `aws s3 cp` per pair: content-hashed
//    files first, the other files next, HTML last, so a page never names a file that isn't there yet;
// 2. `aws s3 sync --delete --size-only` removes what the build no longer has (everything it would upload is
//    already there with the same size, so it uploads nothing);
// 3. one invalidation of /*, waited for.
// The AASA file (no extension) takes application/json from _headers' Content-Type (scripts/aws/rules.mjs).
import { NOT_UPLOADED } from './rules.mjs';

const BUCKET = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const DISTRIBUTION = /^E[A-Z0-9]{5,20}$/;
// Characters the AWS CLI's --include patterns would read as a pattern.
const GLOB = /[*?[\]!]/;

const rank = (o) => (o.cacheControl?.includes('immutable') ? 0 : o.contentType.startsWith('text/html') ? 2 : 1);

/** Groups of objects that share a content type and Cache-Control, in upload order. */
export function groups(plan) {
  const byKey = new Map();
  for (const o of plan) {
    if (GLOB.test(o.key)) throw new Error(`${o.key}: the AWS CLI would read it as a pattern`);
    const id = `${rank(o)}\u0000${o.contentType}\u0000${o.cacheControl ?? ''}`;
    if (!byKey.has(id)) byKey.set(id, { rank: rank(o), contentType: o.contentType, cacheControl: o.cacheControl, keys: [] });
    byKey.get(id).keys.push(o.key);
  }
  return [...byKey.values()].sort((a, b) => a.rank - b.rank || a.contentType.localeCompare(b.contentType) || (a.cacheControl ?? '').localeCompare(b.cacheControl ?? ''));
}

export function commands(plan, { dist, bucket, distribution }) {
  if (!BUCKET.test(bucket ?? '')) throw new Error(`bucket "${bucket}" is not an S3 bucket name`);
  if (!DISTRIBUTION.test(distribution ?? '')) throw new Error(`distribution "${distribution}" is not a CloudFront distribution id`);
  const target = `s3://${bucket}/`;
  const uploads = groups(plan).map((g) => [
    's3', 'cp', dist, target, '--recursive', '--only-show-errors', '--no-guess-mime-type',
    '--exclude', '*', ...g.keys.flatMap((k) => ['--include', k]),
    '--content-type', g.contentType,
    ...(g.cacheControl ? ['--cache-control', g.cacheControl] : []),
  ]);
  const prune = ['s3', 'sync', dist, target, '--delete', '--size-only', '--only-show-errors', ...NOT_UPLOADED.flatMap((k) => ['--exclude', k])];
  return { uploads, prune, invalidate: ['cloudfront', 'create-invalidation', '--distribution-id', distribution, '--paths', '/*', '--query', 'Invalidation.Id', '--output', 'text'] };
}
