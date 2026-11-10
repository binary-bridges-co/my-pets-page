// The reader (§15.8 r2) on synthetic records. Until public-card.json version 2 is pinned, these are the
// reader's tests; afterwards they stay beside the Spec's reader cases (vectors.test.ts).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkJpeg } from '../../src/jpeg';
import { type Outcome, readRecords, recordNames } from '../../src/reader';
import { CHIP_TAG, card, jpeg, operation, PHOTO, record, sha256Hex, tagKey, utf8 } from '../support/records';

const NOW = Date.parse('2026-11-04T23:15:00.000Z');
const T = (minutesBefore: number): string => new Date(NOW - minutesBefore * 60_000).toISOString();
const DAY = 24 * 60;

const owner = await tagKey(1);
const other = await tagKey(2);
const id = owner.id;
const [n0, n1, n2] = recordNames(id) as [string, string, string];
const photoSha = await sha256Hex(PHOTO);

async function read(...records: Awaited<ReturnType<typeof record>>[]): Promise<Outcome> {
  return readRecords(id, records, NOW);
}

const rejected = (o: Outcome): string[] => o.rejected.map((r) => `${r.name} ${r.error}`);

test('the names asked for are the id and seven successors', () => {
  assert.deepEqual(recordNames('AAAA-BBBB-CCCC-DDDD-EEEE').slice(-1), ['AAAA-BBBB-CCCC-DDDD-EEEE.7']);
  assert.equal(recordNames(id).length, 8);
});

test('no record is not published', async () => {
  assert.deepEqual(await read(), { state: 'notPublished', rejected: [] });
});

test('a card at the id is published, with its exact bytes', async () => {
  const o = await read(await record(owner, n0, card({ published: T(5) })));
  assert.equal(o.state, 'published');
  if (o.state !== 'published') return;
  assert.equal(o.recordName, n0);
  assert.equal(o.published, T(5));
  assert.equal(o.card.name, 'Test Dog');
  assert.equal(o.photo, undefined);
});

test('a reservation (an unpublish) is unpublished', async () => {
  const o = await read(await record(owner, n0, operation('unpublish', id, T(5))));
  assert.equal(o.state, 'unpublished');
});

test('the newest decides: a tombstone beats an older copy under a successor', async () => {
  const o = await read(await record(owner, n0, operation('unpublish', id, T(5))), await record(owner, n1, card({ published: T(60) })));
  assert.equal(o.state, 'unpublished');
});

test('a newer card under a successor wins over the id', async () => {
  const o = await read(await record(owner, n0, card({ published: T(60), name: 'Old' })), await record(owner, n1, card({ published: T(5), name: 'New' })));
  assert.equal(o.state === 'published' && o.card.name, 'New');
});

test('a deactivate wins over a newer publish, under any name', async () => {
  const o = await read(await record(owner, n0, card({ published: T(1) })), await record(owner, n2, operation('deactivate', id, T(60))));
  assert.deepEqual([o.state, 'recordName' in o && o.recordName], ['deactivated', n2]);
});

test('a tie goes to the operation, then to the lower name', async () => {
  const tieOp = await read(await record(owner, n1, card({ published: T(5) })), await record(owner, n0, operation('unpublish', id, T(5))));
  assert.equal(tieOp.state, 'unpublished');
  const tieName = await read(await record(owner, n1, card({ published: T(5), name: 'One' })), await record(owner, n0, card({ published: T(5), name: 'Zero' })));
  assert.equal(tieName.state === 'published' && tieName.card.name, 'Zero');
});

test('older than 395 days is ignored; exactly 395 days is accepted', async () => {
  const stale = await read(await record(owner, n0, card({ published: T(395 * DAY + 1) })));
  assert.deepEqual(rejected(stale), [`${n0} published.stale`]);
  const edge = await read(await record(owner, n0, card({ published: T(395 * DAY) })));
  assert.equal(edge.state, 'published');
  const oldDeactivate = await read(await record(owner, n0, operation('deactivate', id, T(800 * DAY))), await record(owner, n1, card({ published: T(5) })));
  assert.equal(oldDeactivate.state, 'deactivated', 'a deactivate never ages out');
});

test('forged, borrowed and mis-tagged records are refused with their §15.4 codes', async () => {
  const cases: [Promise<Awaited<ReturnType<typeof record>>>, string][] = [
    [record(owner, n0, card({ published: T(5) }), { signer: other }), 'sig.invalid'],
    [record(other, n0, card({ published: T(5) })), 'key.mismatch'],
    [record(owner, n0, card({ published: T(5) }), { tag: CHIP_TAG }), 'sig.invalid'],
    [record(owner, n0, operation('unpublish', id, T(5)), { tag: 'mypets/public-card/v1' }), 'sig.invalid'],
    [record(owner, n0, operation('deactivate', other.id, T(5))), 'card.invalid'],
    [record(owner, n0, utf8('{"published":"2026-11-04T23:10:00.000Z", "v":1}')), 'card.notCanonical'],
    [record(owner, n0, { ...card({ published: T(5) }), v: 2 }), 'card.unsupportedVersion'],
    [record(owner, n0, { ...card({ published: T(5) }), address: 'x' }), 'card.invalid'],
  ];
  for (const [r, code] of cases) assert.deepEqual(rejected(await read(await r)), [`${n0} ${code}`], code);
});

test('a key that fails §2.4 is request.malformed', async () => {
  const r = await record(owner, n0, card({ published: T(5) }));
  const small = { ...r, fields: { ...r.fields, key: { type: 'BYTES', bytes: new Uint8Array(32) } } };
  assert.deepEqual(rejected(await read(small)), [`${n0} request.malformed`]);
});

test('the record layout is checked first: record.invalid', async () => {
  const good = await record(owner, n0, card({ published: T(5) }));
  const variants = [
    { ...good, fields: { ...good.fields, extra: { type: 'STRING', value: 'x' } } },
    { ...good, fields: { v: good.fields.v, key: good.fields.key, body: good.fields.body } as typeof good.fields },
    { ...good, fields: { ...good.fields, v: { type: 'STRING', value: '1' } } },
    { ...good, fields: { ...good.fields, v: { type: 'INT64', value: 2 } } },
    { ...good, fields: { ...good.fields, key: { type: 'BYTES', bytes: owner.pub.subarray(0, 31) } } },
    { ...good, fields: { ...good.fields, body: { type: 'BYTES', bytes: new Uint8Array(4097).fill(0x20) } } },
    { ...good, fields: { ...good.fields, sig: { type: 'BYTES' } } },
    { ...good, name: `${id}.8` },
    { ...good, name: id.toLowerCase() },
    { ...good, name: other.id },
  ];
  for (const r of variants) assert.deepEqual(rejected(await read(r)), [`${r.name} record.invalid`], JSON.stringify(Object.keys(r.fields)));
  const opWithPhoto = await record(owner, n0, operation('unpublish', id, T(5)), { photo: PHOTO });
  assert.deepEqual(rejected(await read(opWithPhoto)), [`${n0} record.invalid`]);
});

test('a forged record beside the owner\'s is ignored and the owner\'s shows', async () => {
  const o = await read(await record(owner, n0, card({ published: T(60) })), await record(other, n1, card({ published: T(1), name: 'Forged' })));
  assert.equal(o.state === 'published' && o.card.name, 'Test Dog');
  assert.deepEqual(rejected(o), [`${n1} key.mismatch`]);
});

test('every photo rule: shown only when it passes, and the card shows either way', async () => {
  const named = card({ published: T(5), photoSha256: photoSha });
  const shown = await read(await record(owner, n0, named, { photo: PHOTO }));
  assert.ok(shown.state === 'published' && shown.photo && shown.photoError === undefined);
  const cases: [Uint8Array | undefined, Record<string, unknown>, string][] = [
    [jpeg(32, 32), named, 'photo.mismatch'],
    [undefined, named, 'photo.mismatch'],
    [PHOTO, card({ published: T(5) }), 'photo.mismatch'],
    [jpeg(64, 64), card({ published: T(5), photoSha256: await sha256Hex(jpeg(64, 64)) }), 'photo.invalid'],
  ];
  const exif = Uint8Array.from([...PHOTO.subarray(0, 2), 0xff, 0xe1, 0x00, 0x04, 0x00, 0x00, ...PHOTO.subarray(2)]);
  cases.push([exif, card({ published: T(5), photoSha256: await sha256Hex(exif) }), 'photo.invalid']);
  for (const [bytes, body, code] of cases) {
    const o = await read(await record(owner, n0, body, bytes ? { photo: bytes } : {}));
    assert.ok(o.state === 'published', code);
    if (o.state !== 'published') continue;
    assert.equal(o.photoError, code);
    assert.equal(o.photo, undefined);
  }
});

test('the test JPEG follows the photo rule', () => {
  assert.deepEqual(checkJpeg(PHOTO), { width: 64, height: 48 });
  assert.equal(checkJpeg(PHOTO.subarray(0, PHOTO.length - 1)), undefined);
  assert.equal(checkJpeg(Uint8Array.from([...PHOTO, 0])), undefined);
  const long = Uint8Array.from(PHOTO);
  long.set([0x00, 14], 2 + 18 + 69 + 2); // SOF0 length 14 instead of 11
  assert.equal(checkJpeg(long), undefined);
});

test('card text is kept as text', async () => {
  const name = '<img src=x onerror=alert(1)>';
  const o = await read(await record(owner, n0, card({ published: T(5), name })));
  assert.equal(o.state === 'published' && o.card.name, name);
});
