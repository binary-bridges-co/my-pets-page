// Ed25519 verification with Spec §2.4's rules (§15.4): the key checks of rule 1, S < L, and the
// cofactorless equation R = [S]B - [k]A, compared as encodings, so a non-canonical R is refused. This
// is the JDK's behaviour, which the server and the vectors' edge cases pin; @noble/ed25519 supplies
// only the curve arithmetic (its own verify is cofactored and would accept more).
import { Point } from '@noble/ed25519';

// §2.4 rule 1 and Appendix A: the ten small-order encodings.
const SMALL_ORDER = new Set([
  '0000000000000000000000000000000000000000000000000000000000000000',
  '0000000000000000000000000000000000000000000000000000000000000080',
  '0100000000000000000000000000000000000000000000000000000000000000',
  '0100000000000000000000000000000000000000000000000000000000000080',
  '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05',
  '26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85',
  'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a',
  'c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa',
  'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
]);
const P = (1n << 255n) - 19n;
const L = (1n << 252n) + 27742317777372353535851937790883648493n;

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function littleEndian(bytes: Uint8Array): bigint {
  let n = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) n = (n << 8n) | BigInt(bytes[i] as number);
  return n;
}

/** §2.4 rule 1: 32 bytes, not a listed small-order encoding, y (bit 255 cleared) < p. */
export function keyPassesRules(key: Uint8Array): boolean {
  if (key.length !== 32 || SMALL_ORDER.has(hex(key))) return false;
  return (littleEndian(key) & ((1n << 255n) - 1n)) < P;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** §2.4 rules 2 and 3 for a key that passed rule 1. Any decoding failure is false. */
export async function verifyStrict(key: Uint8Array, message: Uint8Array, sig: Uint8Array): Promise<boolean> {
  if (sig.length !== 64) return false;
  const r = sig.subarray(0, 32);
  const s = littleEndian(sig.subarray(32));
  if (s >= L) return false;
  let a: Point;
  try {
    a = Point.fromBytes(Uint8Array.from(key), false);
  } catch {
    return false;
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-512', concat(r, key, message) as Uint8Array<ArrayBuffer>));
  const k = littleEndian(digest) % L;
  const expected = Point.BASE.multiplyUnsafe(s).subtract(a.multiplyUnsafe(k)).toBytes();
  for (let i = 0; i < 32; i++) if (expected[i] !== r[i]) return false;
  return true;
}
