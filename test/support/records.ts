// Synthetic tag keys, signed records and CloudKit answers for tests. Test-only seeds; phones in the
// reserved 555-01xx range; nothing here is anyone's data.
import { getPublicKeyAsync, signAsync } from '@noble/ed25519';
import { jcs } from '../../src/jcs';
import { linkIdOf } from '../../src/fragment';
import { hex } from '../../src/ed25519';
import type { ReaderRecord } from '../../src/reader';

export const CARD_TAG = 'mypets/public-card/v1';
export const OP_TAG = 'mypets/public-card-op/v1';
export const CHIP_TAG = 'mypets/tag-card/v1';

export interface TagKey {
  seed: Uint8Array;
  pub: Uint8Array;
  id: string;
}

export async function tagKey(n: number): Promise<TagKey> {
  const seed = new Uint8Array(32).fill(n);
  seed[0] = 0x5e; // "test"
  const pub = await getPublicKeyAsync(seed);
  return { seed, pub, id: await linkIdOf(pub) };
}

export const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

export function message(tag: string, body: Uint8Array): Uint8Array {
  const prefix = utf8(tag);
  const out = new Uint8Array(prefix.length + 1 + body.length);
  out.set(prefix);
  out.set(body, prefix.length + 1);
  return out;
}

export async function sign(key: TagKey, tag: string, body: Uint8Array): Promise<Uint8Array> {
  return signAsync(message(tag, body), key.seed);
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes))));
}

/**
 * A real, decodable baseline JPEG that follows the §15.8 photo rule: JFIF APP0, one DQT, two one-code
 * Huffman tables, SOF0 (8-bit, 1 component), SOS and flat grey blocks (every block "DC 0, EOB").
 */
export function jpeg(width: number, height: number): Uint8Array {
  const blocks = Math.ceil(width / 8) * Math.ceil(height / 8);
  // Two bits per block, '0' (DC category 0) and '0' (EOB), padded with ones.
  const bits = '00'.repeat(blocks);
  const padded = bits + '1'.repeat((8 - (bits.length % 8)) % 8);
  const data = padded.match(/.{8}/g)?.map((b) => parseInt(b, 2)) ?? [];
  const u16 = (n: number): number[] => [n >> 8, n & 0xff];
  const counts = (one: boolean): number[] => [one ? 1 : 0, ...new Array(15).fill(0)];
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe0, ...u16(16), 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0,
    0xff, 0xdb, ...u16(67), 0x00, ...new Array(64).fill(1),
    0xff, 0xc0, ...u16(11), 8, ...u16(height), ...u16(width), 1, 1, 0x11, 0,
    0xff, 0xc4, ...u16(20), 0x00, ...counts(true), 0x00,
    0xff, 0xc4, ...u16(20), 0x10, ...counts(true), 0x00,
    0xff, 0xda, ...u16(8), 1, 1, 0x00, 0, 63, 0,
    ...data,
    0xff, 0xd9,
  ]);
}

export const PHOTO = jpeg(64, 48);

export interface CardOptions {
  published: string;
  name?: string;
  lost?: boolean;
  photoSha256?: string;
  phone?: string;
}

/** A full card (§15.3) with every member, as the app writes it. */
export function card(o: CardOptions): Record<string, unknown> {
  const c: Record<string, unknown> = {
    v: 1,
    published: o.published,
    name: o.name ?? 'Test Dog',
    species: 'dog',
    breed: 'Mixed',
    phone: o.phone ?? '+1 555 0100',
    alternate: { label: 'Sister', name: 'Alex', phone: '+1 (555) 0101' },
    health: { allergies: ['Chicken'], medication: [{ text: 'Ear drops', canSkip: true }] },
    vet: { name: 'Test Clinic', phone: '555-0102' },
    microchip: '000000000000001',
  };
  if (o.photoSha256) c.photo = { sha256: o.photoSha256, w: 64, h: 48 };
  if (o.lost) {
    c.lost = {
      since: '2026-11-04T06:10:00-05:00',
      area: 'Test Park',
      description: 'Red collar',
      lastSeen: { label: 'near the gate', at: '2026-11-04T06:40:00-05:00' },
    };
  }
  return c;
}

export function operation(op: 'unpublish' | 'deactivate', id: string, published: string): Record<string, unknown> {
  return { v: 1, op, id, published };
}

export interface RecordOptions {
  tag?: string;
  signer?: TagKey;
  photo?: Uint8Array;
  /** Bytes stored as `body` instead of the signed ones (an altered copy). */
  sent?: Uint8Array;
}

/** A PublicLink record signed by [key] (or [o.signer]) over JCS([body]). */
export async function record(key: TagKey, name: string, body: Record<string, unknown> | Uint8Array, o: RecordOptions = {}): Promise<ReaderRecord> {
  const bytes = body instanceof Uint8Array ? body : utf8(jcs(body));
  const isOp = !(body instanceof Uint8Array) && 'op' in body;
  const sig = await sign(o.signer ?? key, o.tag ?? (isOp ? OP_TAG : CARD_TAG), bytes);
  const fields: ReaderRecord['fields'] = {
    v: { type: 'INT64', value: 1 },
    key: { type: 'BYTES', bytes: key.pub },
    body: { type: 'BYTES', bytes: o.sent ?? bytes },
    sig: { type: 'BYTES', bytes: sig },
    ...(o.photo ? { photo: { type: 'BYTES', bytes: o.photo } } : {}),
  };
  return { name, fields };
}

/** The CloudKit answer of a records/lookup that found [records] among [names] (docs/DESIGN.md §3 C2). */
export function lookupAnswer(names: readonly string[], records: readonly ReaderRecord[]): unknown {
  return {
    records: names.map((recordName) => {
      const r = records.find((x) => x.name === recordName);
      if (!r) return { recordName, reason: 'Record not found', serverErrorCode: 'NOT_FOUND' };
      const fields: Record<string, unknown> = {};
      for (const [k, f] of Object.entries(r.fields)) fields[k] = { type: f.type, value: f.bytes ? toBase64(f.bytes) : f.value };
      return {
        recordName,
        recordType: 'PublicLink',
        recordChangeTag: 'mf0test1',
        fields,
        created: { timestamp: 1762297800000, userRecordName: '_0123456789abcdef0123456789abcdef', deviceID: '2' },
        modified: { timestamp: 1762297800000, userRecordName: '_0123456789abcdef0123456789abcdef', deviceID: '2' },
        deleted: false,
      };
    }),
  };
}

/** A tag's fragment (§15.5): `1.` + base64url(card ‖ salt ‖ key ‖ sig), the card signed under the chip tag. */
export async function fragment(key: TagKey, chipCard: Record<string, unknown>, o: { signer?: TagKey; tag?: string; sent?: Uint8Array } = {}): Promise<string> {
  const bytes = utf8(jcs(chipCard));
  const sig = await sign(o.signer ?? key, o.tag ?? CHIP_TAG, bytes);
  const sent = o.sent ?? bytes;
  const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
  const p = new Uint8Array(sent.length + 16 + 32 + 64);
  p.set(sent);
  p.set(salt, sent.length);
  p.set(key.pub, sent.length + 16);
  p.set(sig, sent.length + 48);
  return `1.${toBase64Url(p)}`;
}

export function chipCard(name = 'Tag Dog'): Record<string, unknown> {
  return {
    v: 1,
    published: '2026-10-02T15:00:00.000Z',
    name,
    species: 'dog',
    breed: 'Mixed',
    phone: '+1 555 0100',
    health: { allergies: ['Chicken'] },
    vet: { name: 'Test Clinic', phone: '555-0102' },
    microchip: '000000000000001',
  };
}
