// The card on a chip (Spec §15.3 and §15.5): the member table without `lost` and `photo`.
// Members, kinds and limits of Spec §15.3 (iOS 5c445cf5), the text rule with its bidi controls and
// line separators; chip cards never have `lost` or `photo` (§15.5).

export interface ChipContact { name: string; phone?: string; label?: string }
export interface ChipMedication { text: string; canSkip?: boolean }
export interface ChipCard {
  published: string;
  name: string;
  species: string;
  breed?: string;
  phone?: string;
  alternate?: ChipContact;
  allergies: string[];
  medication: ChipMedication[];
  vet?: ChipContact;
  microchip?: string;
}

export class CardRefusal extends Error {}

type Obj = Record<string, unknown>;

const PHONE = /^[0-9 +\-().]{1,32}$/;
const RECORDED = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})\.[0-9]{3}Z$/;
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

function isRecorded(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const m = RECORDED.exec(v);
  if (!m) return false;
  const [y, mo, d, h, mi, s] = m.slice(1).map(Number) as [number, number, number, number, number, number];
  if (y < 1 || mo < 1 || mo > 12 || h > 23 || mi > 59 || s > 59) return false;
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return d >= 1 && d <= days;
}

function members(obj: Obj, allowed: string[]): void {
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

function contact(v: unknown, nameMax: number, phoneRequired: boolean, withLabel: boolean): ChipContact {
  if (!isObj(v)) invalid();
  members(v, withLabel ? ['name', 'phone', 'label'] : ['name', 'phone']);
  const c: ChipContact = { name: text(v, 'name', nameMax, true) as string };
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

/** Checks a parsed chip card; throws CardRefusal with the §15.10 code. */
export function checkChipCard(card: unknown): ChipCard {
  if (!isObj(card)) invalid();
  if (typeof card.v === 'number' && Number.isInteger(card.v) && card.v !== 1) throw new CardRefusal('card.unsupportedVersion');
  if (card.v !== 1) invalid();
  members(card, ['v', 'published', 'name', 'species', 'breed', 'phone', 'alternate', 'health', 'vet', 'microchip']);
  if (!isRecorded(card.published)) invalid();
  const out: ChipCard = {
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
  const chip = text(card, 'microchip', 32, false);
  if (chip !== undefined) out.microchip = chip;
  return out;
}

function medication(x: unknown): ChipMedication {
  if (!isObj(x)) invalid();
  members(x, ['text', 'canSkip']);
  const m: ChipMedication = { text: text(x, 'text', 80, true) as string };
  if (x.canSkip !== undefined) {
    if (typeof x.canSkip !== 'boolean') invalid();
    m.canSkip = x.canSkip;
  }
  return m;
}
