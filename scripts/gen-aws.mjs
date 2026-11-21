// The AWS host's generated CloudFormation blocks (docs/DESIGN.md §10), from a built dist/:
//   node scripts/gen-aws.mjs                     # writes aws/cloudfront.generated.yml
//   node scripts/gen-aws.mjs --check             # fails if aws/cloudfront.generated.yml is stale
//   node scripts/gen-aws.mjs --infra=<template>  # fails unless bb-infrastructure's aws/my-pets-page/stack.yml
//                                                # carries both blocks exactly as committed here
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { GENERATED, hostModel } from './aws/host.mjs';
import { bodySha, extract } from './aws/render.mjs';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const fail = (message) => {
  console.error(`gen-aws: ${message}`);
  process.exit(1);
};

// --infra=<template> or `npm run check:aws-infra -- <template>` (--infra <template>).
const infra = arg('infra') ?? (process.argv.includes('--infra') ? process.argv[process.argv.indexOf('--infra') + 1] : undefined);
if (process.argv.includes('--infra') && !infra) fail('--infra needs the path of bb-infrastructure aws/my-pets-page/stack.yml');
if (infra) {
  const want = extract(readFileSync(GENERATED, 'utf8'));
  const got = extract(readFileSync(infra, 'utf8'));
  for (const name of ['resources', 'behaviors']) {
    if (!want[name]) fail(`aws/cloudfront.generated.yml has no ${name} block`);
    if (!got[name]) fail(`${infra} has no ${name} block`);
    if (bodySha(got[name].body) !== got[name].sha) fail(`${infra}: the ${name} block was edited by hand (its body does not match its sha256)`);
    if (got[name].text !== want[name].text) fail(`${infra}: the ${name} block differs from aws/cloudfront.generated.yml: copy it again`);
  }
  console.log(`gen-aws: ${infra} carries both generated blocks`);
  process.exit(0);
}

if (!existsSync(new URL('../dist/index.html', import.meta.url))) fail('dist/ is missing: run npm run build first');
const { text } = hostModel();
if (process.argv.includes('--check')) {
  const committed = existsSync(GENERATED) ? readFileSync(GENERATED, 'utf8') : '';
  if (committed !== text) fail('aws/cloudfront.generated.yml is stale: run npm run gen:aws, commit it and copy both blocks into bb-infrastructure (docs/RUNBOOK.md §7)');
  console.log('gen-aws: aws/cloudfront.generated.yml is current');
} else {
  writeFileSync(GENERATED, text);
  console.log('gen-aws: wrote aws/cloudfront.generated.yml');
}
