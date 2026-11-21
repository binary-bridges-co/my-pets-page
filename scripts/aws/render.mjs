// Renders the AWS host model (scripts/aws/rules.mjs) as the two generated blocks of bb-infrastructure's
// aws/my-pets-page/stack.yml: the response headers policies and the viewer-request function (resources),
// and the distribution's cache behaviours. Each block sits between BEGIN/END marker lines that carry the
// SHA-256 of its body, so bb-infrastructure can tell a hand edit (make validate) and this repository can
// tell a stale copy (npm run check:aws-infra).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const FUNCTION_SOURCE = new URL('./viewer-request.js', import.meta.url);
const DATA_LINE = 'var DATA = { pages: [], rewrites: [] };';
const CACHING_OPTIMIZED = '658327ea-f89d-4fab-a63d-7e88639e58f6';
const REFERRER = ['no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url'];

/** The function's code: the source (scripts/aws/viewer-request.js) with its DATA line filled in. */
export function functionCode(pages, rewrites, source = readFileSync(FUNCTION_SOURCE, 'utf8')) {
  if (!source.includes(DATA_LINE)) throw new Error('viewer-request.js: the DATA line is missing');
  const data = { pages, rewrites: rewrites.map((r) => [`^${r.from.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, r.to]) };
  return source.replace(DATA_LINE, `var DATA = ${JSON.stringify(data)};`);
}

const q = (s) => JSON.stringify(s);
const pascal = (slug) => slug.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());
export const policyId = (slug) => `Headers${pascal(slug)}`;

/** One response headers policy: the security headers CloudFront models natively, the rest as custom headers. */
function policy(p) {
  const security = [];
  const custom = [];
  for (const [name, value] of p.set.headers) {
    switch (name.toLowerCase()) {
      case 'content-type':
        break; // the S3 object's metadata (scripts/deploy-aws.mjs)
      case 'content-security-policy':
        security.push(`          ContentSecurityPolicy: { ContentSecurityPolicy: ${q(value)}, Override: true }`);
        break;
      case 'strict-transport-security': {
        const m = /^max-age=(\d+)((?:; includeSubDomains)?)((?:; preload)?)$/.exec(value);
        if (!m) throw new Error(`Strict-Transport-Security "${value}" is not max-age=N[; includeSubDomains][; preload]`);
        security.push(`          StrictTransportSecurity: { AccessControlMaxAgeSec: ${m[1]}, IncludeSubdomains: ${Boolean(m[2])}, Preload: ${Boolean(m[3])}, Override: true }`);
        break;
      }
      case 'x-content-type-options':
        if (value !== 'nosniff') throw new Error(`X-Content-Type-Options "${value}": CloudFront only sends nosniff`);
        security.push('          ContentTypeOptions: { Override: true }');
        break;
      case 'x-frame-options':
        if (!['DENY', 'SAMEORIGIN'].includes(value)) throw new Error(`X-Frame-Options "${value}": DENY or SAMEORIGIN`);
        security.push(`          FrameOptions: { FrameOption: ${value}, Override: true }`);
        break;
      case 'referrer-policy':
        if (!REFERRER.includes(value)) throw new Error(`Referrer-Policy "${value}" is not one CloudFront knows`);
        security.push(`          ReferrerPolicy: { ReferrerPolicy: ${value}, Override: true }`);
        break;
      case 'x-xss-protection':
        throw new Error('X-XSS-Protection: not supported by this generator');
      default:
        custom.push(`            - { Header: ${q(name)}, Value: ${q(value)}, Override: true }`);
    }
  }
  const lines = [
    `  ${policyId(p.slug)}:`,
    '    Type: AWS::CloudFront::ResponseHeadersPolicy',
    '    Properties:',
    '      ResponseHeadersPolicyConfig:',
    `        Name: !Sub '\${Environment}-mypets-page-${p.slug}'`,
    `        Comment: ${q(`my-pets-page src/host/_headers: ${p.slug}`)}`,
  ];
  if (security.length) lines.push('        SecurityHeadersConfig:', ...security);
  if (custom.length) lines.push('        CustomHeadersConfig:', '          Items:', ...custom);
  if (p.set.removed.length) lines.push('        RemoveHeadersConfig:', '          Items:', ...p.set.removed.map((h) => `            - { Header: ${q(h)} }`));
  return lines;
}

function behavior(indent, b) {
  const pad = ' '.repeat(indent);
  const lines = [];
  if (b.pathPattern !== undefined) lines.push(`${pad.slice(2)}- PathPattern: ${q(b.pathPattern)}`);
  lines.push(
    `${pad}TargetOriginId: S3Origin`,
    `${pad}ViewerProtocolPolicy: redirect-to-https`,
    `${pad}AllowedMethods: [GET, HEAD]`,
    `${pad}CachedMethods: [GET, HEAD]`,
    `${pad}Compress: true`,
    `${pad}CachePolicyId: ${CACHING_OPTIMIZED}  # Managed-CachingOptimized: no cookie, header or query string reaches S3`,
    `${pad}ResponseHeadersPolicyId: !Ref ${policyId(b.policy)}`,
  );
  if (b.functions) {
    lines.push(`${pad}FunctionAssociations:`, `${pad}  - EventType: viewer-request`, `${pad}    FunctionARN: !GetAtt ViewerRequestFunction.FunctionARN`);
  }
  return lines;
}

function block(name, indent, body) {
  const pad = ' '.repeat(indent);
  const text = `${body.join('\n')}\n`;
  const sha = createHash('sha256').update(text).digest('hex');
  return `${pad}# BEGIN GENERATED ${name} sha256=${sha} (my-pets-page npm run gen:aws; never edit by hand)\n${text}${pad}# END GENERATED ${name}\n`;
}

/** The two blocks, as they appear in the template. */
export function render(m, code) {
  const resources = [];
  for (const p of m.policies) resources.push(...policy(p), '');
  resources.push(
    '  ViewerRequestFunction:',
    '    Type: AWS::CloudFront::Function',
    '    Properties:',
    "      Name: !Sub '${Environment}-mypets-page-viewer-request'",
    '      AutoPublish: true',
    '      FunctionConfig:',
    '        Comment: Cloudflare Pages routing on S3 (my-pets-page scripts/aws/viewer-request.js)',
    '        Runtime: cloudfront-js-2.0',
    '      FunctionCode: |',
    ...code.trimEnd().split('\n').map((l) => (l ? `        ${l}` : '')),
  );
  const behaviors = ['        DefaultCacheBehavior:', ...behavior(10, m.defaultBehavior), '        CacheBehaviors:'];
  for (const b of m.behaviors) behaviors.push(...behavior(12, b));
  return { resources: block('resources', 2, resources), behaviors: block('behaviors', 8, behaviors) };
}

const HEADER = `# Generated by \`npm run gen:aws\` from src/host/_headers, src/host/_redirects, scripts/aws/viewer-request.js
# and the HTML pages of dist/. Never edit by hand. bb-infrastructure's aws/my-pets-page/stack.yml carries
# these two blocks verbatim (docs/RUNBOOK.md §7); \`npm run check:aws-infra -- <that file>\` compares them.

`;

/** The committed file aws/cloudfront.generated.yml: a header, then both blocks. */
export function generatedText(m, code) {
  const blocks = render(m, code);
  return `${HEADER}${blocks.resources}\n${blocks.behaviors}`;
}

/** The blocks found in a template (or in the committed generated file), by name. */
export function extract(text) {
  const found = {};
  const re = /^( *)# BEGIN GENERATED (\w+) sha256=([0-9a-f]{64}).*\n([\s\S]*?)^ *# END GENERATED \2\n/gm;
  for (const m of text.matchAll(re)) found[m[2]] = { text: m[0], sha: m[3], body: m[4] };
  return found;
}

export const bodySha = (body) => createHash('sha256').update(body).digest('hex');
