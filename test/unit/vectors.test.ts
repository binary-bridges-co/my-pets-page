// The page's verifier and fragment reader against Spec/vectors/public-card.json (the copy in
// test/spec, see SPEC_SOURCE): every signature and fragment case gives its declared result, and the
// card cases read as chip cards.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import vectors from '../spec/public-card.json';
import { keyPassesRules, verifyStrict } from '../../src/ed25519';
import { fromBase64Url, linkIdOf, readChipCard, readFragment, signedMessage } from '../../src/fragment';

export interface Case {
  name: string;
  kind: string;
  expect: string;
  error?: string;
  [k: string]: unknown;
}

const TAGS: Record<string, string> = {
  card: 'mypets/public-card/v1',
  operation: 'mypets/public-card-op/v1',
  chipCard: 'mypets/tag-card/v1',
};

export function fromHex(text: string): Uint8Array {
  return Uint8Array.from(text.match(/../g) ?? [], (b) => parseInt(b, 16));
}

const cases = (vectors as { cases: Case[] }).cases;
const want = (c: Case): string => (c.expect === 'valid' ? 'valid' : (c.error as string));

async function signature(c: Case): Promise<string> {
  const key = fromHex(c.keyHex as string);
  const sig = fromBase64Url(c.sig as string);
  if (!keyPassesRules(key) || !sig || sig.length !== 64) return 'request.malformed';
  if ((await linkIdOf(key)) !== c.id) return 'key.mismatch';
  const tag = TAGS[c.tag as string];
  assert.ok(tag, `unknown tag ${String(c.tag)}`);
  return (await verifyStrict(key, signedMessage(tag, fromHex(c.messageHex as string)), sig)) ? 'valid' : 'sig.invalid';
}

async function fragment(c: Case): Promise<string> {
  const url = new URL(c.url as string);
  const r = await readFragment(url.hash.slice(1), url.pathname.replace('/p/', '').toUpperCase());
  if (r.kind === 'copy' || r.kind === 'linkOnly') return 'valid';
  if (r.kind === 'unsupported') return 'fragment.unsupportedVersion';
  return r.code;
}

function kind(name: string, min: number, run: (c: Case) => Promise<string> | string, expected: (c: Case) => string = want): void {
  const of = cases.filter((c) => c.kind === name);
  test(`public-card.json has at least ${min} ${name} cases`, () => assert.ok(of.length >= min, `${of.length}`));
  for (const c of of) test(`${name}: ${c.name}`, async () => assert.equal(await run(c), expected(c)));
}

kind('signature', 16, signature);
kind('fragment', 10, fragment);
// A valid card holding `lost` or `photo` is card.invalid on a chip (§15.5).
kind(
  'card',
  25,
  (c) => {
    const read = readChipCard(new TextEncoder().encode(c.input as string));
    return typeof read === 'string' ? read : 'valid';
  },
  (c) => (c.expect === 'valid' && /"(lost|photo)":/.test(c.input as string) ? 'card.invalid' : want(c)),
);
