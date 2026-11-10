// cloudkit.ts against answers shaped from the Web Services Reference (docs/DESIGN.md §3): found,
// NOT_FOUND, a throttle, a per-record error, malformed JSON, a timeout, and the request it sends.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fromBase64, lookup, lookupUrl, parseLookup } from '../../src/cloudkit';
import { recordNames } from '../../src/reader';
import { card, lookupAnswer, record, tagKey } from '../support/records';

const CONFIG = { containerId: 'iCloud.co.binarybridges.pets', environment: 'production', apiToken: 'TESTTOKEN' } as const;
const key = await tagKey(1);
const names = recordNames(key.id);
const found = await record(key, key.id, card({ published: '2026-11-04T23:10:00.000Z' }));

test('the request URL names the container, the environment and the token, and nothing else', () => {
  assert.equal(lookupUrl(CONFIG), 'https://api.apple-cloudkit.com/database/1/iCloud.co.binarybridges.pets/production/public/records/lookup?ckAPIToken=TESTTOKEN');
});

test('one CORS-simple POST with the eight names, no credentials, no referrer', async () => {
  const calls: [string, RequestInit][] = [];
  const fake = (async (url: string, init: RequestInit) => {
    calls.push([url, init]);
    return new Response(JSON.stringify(lookupAnswer(names, [found])), { status: 200 });
  }) as unknown as typeof fetch;
  const r = await lookup(names, CONFIG, fake);
  assert.equal(calls.length, 1);
  const [url, init] = calls[0] as [string, RequestInit];
  assert.equal(url, lookupUrl(CONFIG));
  assert.equal(init.method, 'POST');
  assert.equal(init.credentials, 'omit');
  assert.equal(init.referrerPolicy, 'no-referrer');
  assert.deepEqual(init.headers, { 'Content-Type': 'text/plain;charset=UTF-8' });
  assert.deepEqual(JSON.parse(init.body as string), { records: names.map((recordName) => ({ recordName })) });
  assert.ok(r.ok && r.records.length === 1);
  assert.deepEqual(r.ok && r.records[0], found);
});

test('NOT_FOUND and deleted records are left out', () => {
  const answer = lookupAnswer(names, [found]) as { records: Record<string, unknown>[] };
  (answer.records[1] as Record<string, unknown>) = { ...(answer.records[0] as object), recordName: names[1], deleted: true };
  const r = parseLookup(200, JSON.stringify(answer), names);
  assert.ok(r.ok);
  assert.deepEqual(r.ok && r.records.map((x) => x.name), [key.id]);
});

test('a throttle, an auth error or a server error fails the lookup with its code', () => {
  assert.deepEqual(parseLookup(429, '{"uuid":"u","serverErrorCode":"THROTTLED","reason":"slow down","retryAfter":30}', names), { ok: false, reason: 'THROTTLED' });
  assert.deepEqual(parseLookup(421, '{"serverErrorCode":"AUTHENTICATION_REQUIRED","redirectURL":"https://x"}', names), { ok: false, reason: 'AUTHENTICATION_REQUIRED' });
  assert.deepEqual(parseLookup(503, '<html>', names), { ok: false, reason: 'http.503' });
});

test('a per-record error other than NOT_FOUND fails the whole lookup', () => {
  const body = JSON.stringify({ records: [{ recordName: key.id, serverErrorCode: 'TRY_AGAIN_LATER', reason: 'busy' }] });
  assert.deepEqual(parseLookup(200, body, names), { ok: false, reason: 'TRY_AGAIN_LATER' });
});

test('malformed answers fail', () => {
  for (const text of ['not json', '{}', '{"records":{}}', '{"records":[1]}', '{"records":[{"fields":{}}]}']) {
    assert.deepEqual(parseLookup(200, text, names), { ok: false, reason: 'malformed' }, text);
  }
});

test('a record of another type keeps no field, and bad Base64 keeps no bytes', () => {
  const answer = lookupAnswer(names, [found]) as { records: Record<string, unknown>[] };
  const first = answer.records[0] as Record<string, unknown>;
  const r1 = parseLookup(200, JSON.stringify({ records: [{ ...first, recordType: 'Other' }] }), names);
  assert.deepEqual(r1.ok && r1.records[0]?.fields, {});
  const fields = { ...(first.fields as object), key: { type: 'BYTES', value: 'not base64!' } };
  const r2 = parseLookup(200, JSON.stringify({ records: [{ ...first, fields }] }), names);
  assert.deepEqual(r2.ok && r2.records[0]?.fields.key, { type: 'BYTES' });
});

test('Base64 is standard, padding optional', () => {
  assert.deepEqual(fromBase64('AQID'), Uint8Array.from([1, 2, 3]));
  assert.deepEqual(fromBase64('AQ=='), Uint8Array.from([1]));
  assert.deepEqual(fromBase64('AQ'), Uint8Array.from([1]));
  assert.equal(fromBase64('AQ='), undefined);
  assert.equal(fromBase64('A-_B'), undefined);
});

test('a network failure or a timeout is a failure, never a throw', async () => {
  const offline = (async () => {
    throw new TypeError('Failed to fetch');
  }) as unknown as typeof fetch;
  assert.deepEqual(await lookup(names, CONFIG, offline), { ok: false, reason: 'network' });
  const timeout = (async () => {
    throw new DOMException('timed out', 'TimeoutError');
  }) as unknown as typeof fetch;
  assert.deepEqual(await lookup(names, CONFIG, timeout), { ok: false, reason: 'network' });
});
