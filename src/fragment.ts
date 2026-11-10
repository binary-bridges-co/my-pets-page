// Reading a tag's fragment in the browser (Spec §15.5, DESIGN §7.2 item 1). Nothing here touches the
// network: WebCrypto SHA-256 for the link id, ed25519.ts (on vendored @noble/ed25519) for the signature.
// Layout, order of checks and codes of Spec §15.5 (iOS 5c445cf5):
// `1.` + base64url(card ‖ salt 16 ‖ key 32 ‖ sig 64), or `1.` + base64url(salt 16) for link only;
// the card is signed under `mypets/tag-card/v1`, never the server card's tag.
import { keyPassesRules, verifyStrict } from './ed25519';
import { CardRefusal, checkChipCard, type ChipCard } from './chipCard';
import { parseCanonical } from './jcs';

export type FragmentResult =
  | { kind: 'linkOnly' }
  | { kind: 'unsupported' }
  | { kind: 'refused'; code: string }
  | { kind: 'copy'; card: ChipCard };

const CHIP_TAG = 'mypets/tag-card/v1';
const SALT = 16;
const KEY = 32;
const SIG = 64;
const MAX_CARD_BYTES = 4096;
const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const LINK_ID = /^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){4}$/;

/** Strict base64url (§1.1): the alphabet, no padding, and decode-then-encode gives the same text. */
export function fromBase64Url(text: string): Uint8Array | undefined {
  if (text.length % 4 === 1) return undefined;
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const c of text) {
    const v = B64URL.indexOf(c);
    if (v < 0) return undefined;
    buffer = ((buffer << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  // Canonical: the unused trailing bits must be zero.
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) return undefined;
  return Uint8Array.from(out);
}

/** The link id of a tag public key (§15.2): the first 100 bits of SHA-256, Crockford base32. */
export async function linkIdOf(key: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', Uint8Array.from(key)));
  let out = '';
  for (let i = 0; i < 20; i++) {
    let v = 0;
    for (let bit = i * 5; bit < i * 5 + 5; bit++) v = (v << 1) | (((digest[bit >> 3] as number) >> (7 - (bit & 7))) & 1);
    if (i > 0 && i % 4 === 0) out += '-';
    out += CROCKFORD[v];
  }
  return out;
}

/** The path's link id in upper case, or undefined when it isn't one (§15.2). */
export function pathLinkId(pathname: string): string | undefined {
  const m = /^\/p\/([^/]+)$/.exec(pathname);
  if (!m) return undefined;
  let raw: string;
  try {
    raw = decodeURIComponent(m[1] as string); // as the server reads the path
  } catch {
    return undefined;
  }
  const id = raw.replace(/[a-z]/g, (c) => c.toUpperCase());
  return LINK_ID.test(id) ? id : undefined;
}

/** UTF-8(tag) ‖ 0x00 ‖ the exact bytes (§15.4). */
export function signedMessage(tag: string, bytes: Uint8Array): Uint8Array {
  const prefix = new TextEncoder().encode(tag);
  const out = new Uint8Array(prefix.length + 1 + bytes.length);
  out.set(prefix);
  out.set(bytes, prefix.length + 1);
  return out;
}

/** Reads the fragment (without `#`) for the link [linkId]; every failure is a refusal with its code. */
export async function readFragment(fragment: string, linkId: string): Promise<FragmentResult> {
  const m = /^(0|[1-9][0-9]*)\.(.*)$/s.exec(fragment);
  if (!m) return { kind: 'refused', code: 'fragment.malformed' };
  if (m[1] !== '1') return { kind: 'unsupported' };
  const payload = fromBase64Url(m[2] as string);
  if (!payload) return { kind: 'refused', code: 'fragment.malformed' };
  if (payload.length === SALT) return { kind: 'linkOnly' };
  if (payload.length < SALT + KEY + SIG + 2) return { kind: 'refused', code: 'fragment.malformed' };

  const end = payload.length;
  const sig = payload.subarray(end - SIG);
  const key = payload.subarray(end - SIG - KEY, end - SIG);
  const card = payload.subarray(0, end - SIG - KEY - SALT);

  if (!keyPassesRules(key)) return { kind: 'refused', code: 'request.malformed' };
  if ((await linkIdOf(key)) !== linkId) return { kind: 'refused', code: 'key.mismatch' };
  if (!(await verifyStrict(key, signedMessage(CHIP_TAG, card), sig))) return { kind: 'refused', code: 'sig.invalid' };
  const read = readChipCard(card);
  return typeof read === 'string' ? { kind: 'refused', code: read } : { kind: 'copy', card: read };
}

/** A chip card's signed bytes: canonical JCS, at most 4096 bytes, §15.3 without `lost` and `photo`; else its code. */
export function readChipCard(bytes: Uint8Array): ChipCard | string {
  const parsed = parseCanonical(bytes);
  if (parsed === undefined) return 'card.notCanonical';
  try {
    const card = checkChipCard(parsed);
    return bytes.length > MAX_CARD_BYTES ? 'card.invalid' : card;
  } catch (e) {
    return e instanceof CardRefusal ? e.message : 'card.invalid';
  }
}
