// The card (Spec §15.3 r3) and the operation (§15.4): members, kinds and limits, the text rule with its
// bidi controls and line separators. A card is `v` 1, or `v` 2 exactly when it has `lost.message`
// (r3). A chip card (§15.5) never has `lost` or `photo`, so it is always `v` 1.
import type { CardView, Contact, Medication } from './render';
import { localTime } from './text';
import { parseCanonical } from './jcs';

export interface CardPhoto {
  sha256: string;
  w: number;
  h: number;
}

/** A card that passed §15.3: what the page shows, plus `published` and the photo it names. */
export interface Card extends CardView {
  published: string;
  photo?: CardPhoto;
}

export interface Operation {
  op: 'unpublish' | 'deactivate';
  id: string;
  published: string;
}

/** The chip card is the same object without `lost` and `photo`. */
export type ChipCard = Card;
export type ChipContact = Contact;
export type ChipMedication = Medication;

export class CardRefusal extends Error {}

type Obj = Record<string, unknown>;

export const MAX_CARD_BYTES = 4096;
const PHONE = /^[0-9 +\-().]{1,32}$/;
const RECORDED = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})\.[0-9]{3}Z$/;
const DATETIME = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})([+-])([0-9]{2}):([0-9]{2})$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const LINK_ID = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/;
// Bidirectional controls, line and paragraph separators (§15.3).
const FORBIDDEN = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069\u2028\u2029]/;

function invalid(): never {
  throw new CardRefusal('card.invalid');
}

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Text n: 1 to n code points (0 = no length rule), NFC, no Cc, no bidi control, no lone surrogate. */
export function isText(v: unknown, max: number): v is string {
  if (typeof v !== 'string') return false;
  let points = 0;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = v.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return false;
    } else if (c < 0x20 || (c >= 0x7f && c <= 0x9f)) {
      return false;
    }
    points++;
  }
  if (points < 1 || (max > 0 && points > max)) return false;
  if (FORBIDDEN.test(v)) return false;
  return v.normalize('NFC') === v;
}

function isPhone(v: unknown): v is string {
  return typeof v === 'string' && PHONE.test(v) && /[0-9]/.test(v);
}

function isDate(y: number, mo: number, d: number): boolean {
  if (y < 1 || mo < 1 || mo > 12) return false;
  return d >= 1 && d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

/** §1.2 `recorded`: UTC with exactly three fraction digits and `Z`. */
export function isRecorded(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = RECORDED.exec(v);
  if (!m) return false;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number) as [number, number, number, number, number, number];
  return isDate(y, mo, d) && h <= 23 && mi <= 59 && s <= 59;
}

/** §1.2 datetime with the owner's offset: ±14:00 at most, and never -00:00. */
export function isDateTime(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = DATETIME.exec(v);
  if (!m) return false;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number) as [number, number, number, number, number, number];
  const oh = Number(m[8]);
  const om = Number(m[9]);
  if (!isDate(y, mo, d) || h > 23 || mi > 59 || s > 59 || om > 59) return false;
  if (oh > 14 || (oh === 14 && om > 0)) return false;
  return !(m[7] === '-' && oh === 0 && om === 0);
}

function members(obj: Obj, allowed: readonly string[]): void {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) invalid();
}

function text(obj: Obj, key: string, max: number, required: boolean): string | undefined {
  const v = obj[key];
  if (v === undefined) return required ? invalid() : undefined;
  return isText(v, max) ? v : invalid();
}

function phone(obj: Obj, key: string, required: boolean): string | undefined {
  const v = obj[key];
  if (v === undefined) return required ? invalid() : undefined;
  return isPhone(v) ? v : invalid();
}

function contact(v: unknown, nameMax: number, phoneRequired: boolean, withLabel: boolean): Contact {
  if (!isObj(v)) invalid();
  members(v, withLabel ? ['name', 'phone', 'label'] : ['name', 'phone']);
  const c: Contact = { name: text(v, 'name', nameMax, true) as string };
  const p = phone(v, 'phone', phoneRequired);
  if (p !== undefined) c.phone = p;
  const label = withLabel ? text(v, 'label', 40, false) : undefined;
  if (label !== undefined) c.label = label;
  return c;
}

function list<T>(v: unknown, item: (x: unknown) => T): T[] {
  if (!Array.isArray(v) || v.length < 1 || v.length > 10) invalid();
  return v.map(item);
}

function medication(x: unknown): Medication {
  if (!isObj(x)) invalid();
  members(x, ['text', 'canSkip']);
  const m: Medication = { text: text(x, 'text', 80, true) as string };
  if (x.canSkip !== undefined) {
    if (typeof x.canSkip !== 'boolean') invalid();
    m.canSkip = x.canSkip;
  }
  return m;
}

function isPixels(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 1024;
}

function photo(v: unknown): CardPhoto {
  if (!isObj(v)) invalid();
  members(v, ['sha256', 'w', 'h']);
  if (typeof v.sha256 !== 'string' || !SHA256_HEX.test(v.sha256) || !isPixels(v.w) || !isPixels(v.h)) invalid();
  return { sha256: v.sha256, w: v.w, h: v.h };
}

function lost(v: unknown): NonNullable<Card['lost']> {
  if (!isObj(v)) invalid();
  members(v, ['since', 'area', 'description', 'message', 'lastSeen']);
  if (!isDateTime(v.since)) invalid();
  const out: NonNullable<Card['lost']> = { since: localTime(v.since) ?? invalid() };
  const area = text(v, 'area', 80, false);
  if (area !== undefined) out.area = area;
  const description = text(v, 'description', 80, false);
  if (description !== undefined) out.description = description;
  const message = text(v, 'message', 200, false);
  if (message !== undefined) out.message = message;
  if (v.lastSeen !== undefined) {
    const seen = v.lastSeen;
    if (!isObj(seen)) invalid();
    members(seen, ['label', 'at']);
    const label = text(seen, 'label', 80, false);
    if (seen.at !== undefined && !isDateTime(seen.at)) invalid();
    if (label === undefined && seen.at === undefined) invalid();
    if (label !== undefined) out.lastSeenLabel = label;
    if (seen.at !== undefined) out.lastSeenAt = localTime(seen.at as string) ?? invalid();
  }
  return out;
}

/** A known integer `v` ([known]) passes; another integer is card.unsupportedVersion, anything else card.invalid. */
function version(obj: Obj, known: readonly number[]): void {
  if (typeof obj.v === 'number' && Number.isInteger(obj.v) && !known.includes(obj.v)) throw new CardRefusal('card.unsupportedVersion');
  if (!known.includes(obj.v as number)) invalid();
}

/** Checks a parsed card; throws CardRefusal with the §15.10 code. [chip] refuses `lost` and `photo`. */
export function checkCard(card: unknown, chip: boolean): Card {
  if (!isObj(card)) invalid();
  version(card, [1, 2]);
  members(card, ['v', 'published', 'name', 'species', 'breed', 'phone', 'alternate', 'health', 'vet', 'microchip', 'photo', 'lost']);
  if (!isRecorded(card.published)) invalid();
  if (chip && (card.photo !== undefined || card.lost !== undefined)) invalid();
  const out: Card = {
    published: card.published,
    name: text(card, 'name', 40, true) as string,
    species: text(card, 'species', 40, true) as string,
    allergies: [],
    medication: [],
  };
  const breed = text(card, 'breed', 80, false);
  if (breed !== undefined) out.breed = breed;
  const p = phone(card, 'phone', false);
  if (p !== undefined) out.phone = p;
  if (card.alternate !== undefined) out.alternate = contact(card.alternate, 40, true, true);
  if (card.health !== undefined) {
    const h = card.health;
    if (!isObj(h)) invalid();
    members(h, ['allergies', 'medication']);
    if (h.allergies === undefined && h.medication === undefined) invalid();
    if (h.allergies !== undefined) out.allergies = list(h.allergies, (x) => (isText(x, 80) ? x : invalid()));
    if (h.medication !== undefined) out.medication = list(h.medication, medication);
  }
  if (card.vet !== undefined) out.vet = contact(card.vet, 80, false, false);
  const chipNumber = text(card, 'microchip', 32, false);
  if (chipNumber !== undefined) out.microchip = chipNumber;
  if (card.photo !== undefined) out.photo = photo(card.photo);
  if (card.lost !== undefined) out.lost = lost(card.lost);
  // §15.3 r3: `v` 2 exactly when the card has `lost.message`.
  if ((card.v === 2) !== (out.lost?.message !== undefined)) invalid();
  return out;
}

/** The chip card of §15.5. */
export function checkChipCard(card: unknown): Card {
  return checkCard(card, true);
}

/** §15.4: exactly `{v: 1, op, id, published}`, `op` unpublish or deactivate, `id` an upper-case link id. */
export function checkOperation(obj: unknown): Operation {
  if (!isObj(obj)) invalid();
  version(obj, [1]);
  members(obj, ['v', 'op', 'id', 'published']);
  if (obj.op !== 'unpublish' && obj.op !== 'deactivate') invalid();
  if (typeof obj.id !== 'string' || !LINK_ID.test(obj.id)) invalid();
  if (!isRecorded(obj.published)) invalid();
  return { op: obj.op, id: obj.id, published: obj.published };
}

/** Signed bytes, after their signature passed: canonical JCS, at most 4096 bytes, then the rules; else the code. */
export function readSigned<T>(bytes: Uint8Array, check: (parsed: unknown) => T): T | string {
  const parsed = parseCanonical(bytes);
  if (parsed === undefined) return 'card.notCanonical';
  try {
    const out = check(parsed);
    return bytes.length > MAX_CARD_BYTES ? 'card.invalid' : out;
  } catch (e) {
    return e instanceof CardRefusal ? e.message : 'card.invalid';
  }
}
