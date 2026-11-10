// What a reader accepts (Spec §15.8 r2): the records of one lookup → the link's state. The same code
// runs the `reader` cases of public-card.json in Node and the page in the browser. It knows nothing of
// CloudKit's wire form (cloudkit.ts turns that into ReaderRecord).
import { type Card, checkCard, checkOperation, type Operation, readSigned } from './card';
import { hex, keyPassesRules, verifyStrict } from './ed25519';
import { linkIdOf, signedMessage } from './fragment';
import { checkJpeg, MAX_PHOTO_BYTES } from './jpeg';

export interface FieldValue {
  type: string;
  /** Set for BYTES fields whose transport encoding decoded. */
  bytes?: Uint8Array;
  value?: unknown;
}

export interface ReaderRecord {
  name: string;
  fields: Readonly<Record<string, FieldValue>>;
}

export interface Rejected {
  name: string;
  error: string;
}

export type Outcome =
  | {
      state: 'published';
      recordName: string;
      published: string;
      card: Card;
      cardBytes: Uint8Array;
      /** The photo's bytes, only when they passed step 3. */
      photo?: Uint8Array;
      photoError?: string;
      rejected: Rejected[];
    }
  | { state: 'unpublished' | 'deactivated'; recordName: string; published: string; rejected: Rejected[] }
  | { state: 'notPublished'; rejected: Rejected[] };

const CARD_TAG = 'mypets/public-card/v1';
const OP_TAG = 'mypets/public-card-op/v1';
// the eight names, the field table and its sizes (§15.7 r2).
export const SUCCESSORS = 7;
const MAX_BODY = 4096;
// 395 days for a card or an unpublish, exactly 395 accepted (§15.8 r2 step 4).
const MAX_AGE_MS = 395 * 24 * 60 * 60 * 1000;

/** `<id>`, then `<id>.1` … `<id>.7`: the names one lookup asks for. */
export function recordNames(id: string): string[] {
  return [id, ...Array.from({ length: SUCCESSORS }, (_, i) => `${id}.${i + 1}`)];
}

type Accepted =
  | { kind: 'card'; name: string; published: string; card: Card; bytes: Uint8Array; photo?: Uint8Array; photoError?: string }
  | { kind: 'op'; name: string; published: string; op: Operation };

class Ignored extends Error {}

function ignore(code: string): never {
  throw new Ignored(code);
}

function bytesField(f: FieldValue | undefined, min: number, max: number): Uint8Array {
  if (!f || f.type !== 'BYTES' || !f.bytes || f.bytes.length < min || f.bytes.length > max) ignore('record.invalid');
  return f.bytes;
}

// an operation is a body that is a JSON object with an `op` member; anything else is a card.
function isOperationShape(body: Uint8Array): boolean {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) && Object.prototype.hasOwnProperty.call(parsed, 'op');
  } catch {
    return false;
  }
}

async function sha256(bytes: Uint8Array): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes))));
}

/** Step 3: the photo's bytes when they pass, else the code; the card is kept either way. */
async function checkPhoto(card: Card, stored: Uint8Array | undefined): Promise<{ photo?: Uint8Array; photoError?: string }> {
  // bytes beside a card without `photo` are photo.mismatch; never shown.
  if (!card.photo) return stored ? { photoError: 'photo.mismatch' } : {};
  if (!stored || (await sha256(stored)) !== card.photo.sha256) return { photoError: 'photo.mismatch' };
  const size = checkJpeg(stored);
  if (!size || size.width !== card.photo.w || size.height !== card.photo.h) return { photoError: 'photo.invalid' };
  return { photo: stored };
}

async function accept(id: string, names: readonly string[], r: ReaderRecord, nowMs: number): Promise<Accepted> {
  // Step 1: the record.
  if (!names.includes(r.name)) ignore('record.invalid');
  const f = r.fields;
  for (const k of Object.keys(f)) if (!['v', 'key', 'body', 'sig', 'photo'].includes(k)) ignore('record.invalid');
  const v = f.v;
  if (!v || v.type !== 'INT64' || v.value !== 1) ignore('record.invalid');
  const key = bytesField(f.key, 32, 32);
  const body = bytesField(f.body, 1, MAX_BODY);
  const sig = bytesField(f.sig, 64, 64);
  const photo = f.photo === undefined ? undefined : bytesField(f.photo, 1, MAX_PHOTO_BYTES);
  const isOp = isOperationShape(body);
  // an operation beside a photo breaks the record.
  if (isOp && photo) ignore('record.invalid');

  // Step 2: §15.4, in its order.
  if (!keyPassesRules(key)) ignore('request.malformed');
  if ((await linkIdOf(key)) !== id) ignore('key.mismatch');
  if (!(await verifyStrict(key, signedMessage(isOp ? OP_TAG : CARD_TAG, body), sig))) ignore('sig.invalid');
  let accepted: Accepted;
  if (isOp) {
    const op = readSigned(body, checkOperation);
    if (typeof op === 'string') ignore(op);
    if (op.id !== id) ignore('card.invalid');
    accepted = { kind: 'op', name: r.name, published: op.published, op };
  } else {
    const card = readSigned(body, (parsed) => checkCard(parsed, false));
    if (typeof card === 'string') ignore(card);
    // Step 3.
    accepted = { kind: 'card', name: r.name, published: card.published, card, bytes: body, ...(await checkPhoto(card, photo)) };
  }
  // Step 4: a deactivate never ages out (it is final, and only the tag key signs one).
  const final = accepted.kind === 'op' && accepted.op.op === 'deactivate';
  if (!final && nowMs - Date.parse(accepted.published) > MAX_AGE_MS) ignore('published.stale');
  return accepted;
}

/** The newest first; a tie goes to the operation, then to the lower record name. */
function decides(a: Accepted, b: Accepted): number {
  if (a.published !== b.published) return a.published > b.published ? -1 : 1;
  if (a.kind !== b.kind) return a.kind === 'op' ? -1 : 1;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** §15.8 r2 over the records one lookup returned for the link [id] (upper case). */
export async function readRecords(id: string, records: readonly ReaderRecord[], nowMs: number): Promise<Outcome> {
  const names = recordNames(id);
  const accepted: Accepted[] = [];
  const rejected: Rejected[] = [];
  for (const r of records) {
    try {
      accepted.push(await accept(id, names, r, nowMs));
    } catch (e) {
      if (!(e instanceof Ignored)) throw e;
      rejected.push({ name: r.name, error: e.message });
    }
  }
  // any deactivate wins, whatever is newer.
  const deactivate = accepted.filter((a) => a.kind === 'op' && a.op.op === 'deactivate').sort(decides)[0];
  if (deactivate) return { state: 'deactivated', recordName: deactivate.name, published: deactivate.published, rejected };
  const top = [...accepted].sort(decides)[0];
  if (!top) return { state: 'notPublished', rejected };
  if (top.kind === 'op') return { state: 'unpublished', recordName: top.name, published: top.published, rejected };
  const out: Outcome = { state: 'published', recordName: top.name, published: top.published, card: top.card, cardBytes: top.bytes, rejected };
  if (top.photo) out.photo = top.photo;
  if (top.photoError) out.photoError = top.photoError;
  return out;
}
