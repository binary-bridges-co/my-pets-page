// Everything the AWS host derives from the repository and a built dist/: the rules, the CloudFront model,
// the function code, the generated CloudFormation blocks and the upload plan (docs/DESIGN.md §10).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { functionCode, generatedText, render } from './render.mjs';
import { htmlPages, listKeys, model, parseHeaders, parseRewrites, uploadPlan } from './rules.mjs';

export const ROOT = new URL('../../', import.meta.url);
// The committed copy of the generated blocks; bb-infrastructure's aws/my-pets-page/stack.yml carries the same.
export const GENERATED = new URL('aws/cloudfront.generated.yml', ROOT);

export function hostModel(dist = new URL('dist/', ROOT)) {
  const rules = parseHeaders(readFileSync(new URL('src/host/_headers', ROOT), 'utf8'));
  const rewrites = parseRewrites(readFileSync(new URL('src/host/_redirects', ROOT), 'utf8'));
  const keys = listKeys(fileURLToPath(dist));
  const pages = htmlPages(keys);
  const m = model(rules, rewrites, pages);
  const code = functionCode(pages, rewrites);
  const blocks = render(m, code);
  return { rules, rewrites, keys, pages, model: m, code, blocks, plan: uploadPlan(keys, rules), text: generatedText(m, code) };
}
