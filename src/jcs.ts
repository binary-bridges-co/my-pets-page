// RFC 8785 for the JSON the chip card can hold: strings, integers, booleans, arrays and objects.
// ECMAScript's JSON.stringify is JCS for strings and numbers; members sort by UTF-16 code units.

export function jcs(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(jcs).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${jcs(obj[k])}`).join(',')}}`;
  }
  throw new Error('type');
}

/**
 * The parsed value when [bytes] are strict UTF-8 JSON and their own JCS encoding, else undefined.
 * Duplicate members, whitespace, escapes JCS doesn't use and non-integer forms all fail the byte compare.
 */
export function parseCanonical(bytes: Uint8Array): unknown {
  let text: string;
  let value: unknown;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    value = JSON.parse(text);
  } catch {
    return undefined;
  }
  const again = new TextEncoder().encode(jcs(value));
  if (again.length !== bytes.length) return undefined;
  for (let i = 0; i < bytes.length; i++) if (again[i] !== bytes[i]) return undefined;
  return value;
}
