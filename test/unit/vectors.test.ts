// The page's verifier and fragment reader against Spec/vectors/public-card.json (the copy in
// test/spec, see SPEC_SOURCE): every signature and fragment case gives its declared result, and the
// card cases read as chip cards.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import vectors from '../spec/public-card.json';
import { keyPassesRules, verifyStrict } from '../../src/ed25519';
import { hex } from '../../src/ed25519';
import { fromBase64Url, linkIdOf, readChipCard, readFragment, signedMessage } from '../../src/fragment';
import { type FieldValue, readRecords, type ReaderRecord } from '../../src/reader';

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

// §15.8 r2's reader cases (public-card.json version 2): the records of one lookup, as CloudKit fields
// with `valueHex` for Bytes, and what the page shows.
interface VectorField {
  type: string;
  value?: unknown;
  valueHex?: string;
}

function toReaderRecord(r: { name: string; fields: Record<string, VectorField> }): ReaderRecord {
  const fields: Record<string, FieldValue> = {};
  for (const [k, f] of Object.entries(r.fields)) {
    fields[k] = f.valueHex !== undefined ? { type: f.type, bytes: fromHex(f.valueHex) } : { type: f.type, value: f.value };
  }
  return { name: r.name, fields };
}

/** JSON with every object's members sorted, at every depth, so equal values give equal text. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

const ERRORS: Record<string, string> = { notPublished: 'link.notPublished', unpublished: 'link.unpublished', deactivated: 'link.deactivated' };

/** The reader's outcome in the vector's own terms, so one deepEqual compares every member the case pins. */
async function reader(c: Case): Promise<string> {
  const records = (c.records as { name: string; fields: Record<string, VectorField> }[]).map(toReaderRecord);
  const o = await readRecords(c.id as string, records, Date.parse(c.now as string));
  const got: Record<string, unknown> = { state: o.state, rejected: o.rejected };
  if (o.state !== 'notPublished') Object.assign(got, { recordName: o.recordName, published: o.published });
  if (o.state === 'published') {
    got.cardHex = hex(o.cardBytes);
    if (o.photoError) got.photoError = o.photoError;
    if (o.photo) got.photoSha256 = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(o.photo))));
  } else {
    got.error = ERRORS[o.state];
  }
  return canonical(got);
}

function readerExpected(c: Case): string {
  const want: Record<string, unknown> = { state: c.state, rejected: c.rejected };
  for (const k of ['recordName', 'published', 'cardHex', 'photoError', 'photoSha256', 'error']) if (c[k] !== undefined) want[k] = c[k];
  return canonical(want);
}

test('public-card.json is version 2 (§15 r2)', () => assert.equal((vectors as { version: number }).version, 2));
kind('reader', 42, reader, readerExpected);
