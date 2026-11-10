// Everything CloudKit-specific (docs/DESIGN.md §3): one lookup by record name in the public database,
// with the deploy's read-only API token. Names in, ReaderRecords or a failure out. No cookie, no
// referrer, no retry; the URL fragment never goes in.
import type { FieldValue, ReaderRecord } from './reader';

export interface CloudKitConfig {
  containerId: string;
  environment: 'production' | 'development';
  apiToken: string;
}

export type LookupResult = { ok: true; records: ReaderRecord[] } | { ok: false; reason: string };

export const ENDPOINT = 'https://api.apple-cloudkit.com';
const RECORD_TYPE = 'PublicLink';
const TIMEOUT_MS = 10_000;

export function lookupUrl(c: CloudKitConfig): string {
  return `${ENDPOINT}/database/1/${encodeURIComponent(c.containerId)}/${c.environment}/public/records/lookup?ckAPIToken=${encodeURIComponent(c.apiToken)}`;
}

/** Standard Base64 (CloudKit's Bytes), padding optional; undefined for anything else. */
export function fromBase64(text: string): Uint8Array | undefined {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(text)) return undefined;
  const bare = text.replace(/=+$/, '');
  if (bare.length % 4 === 1 || (text.length > bare.length && text.length % 4 !== 0)) return undefined;
  try {
    const raw = atob(bare + '='.repeat((4 - (bare.length % 4)) % 4));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  } catch {
    return undefined;
  }
}

function field(raw: unknown): FieldValue {
  if (typeof raw !== 'object' || raw === null) return { type: '' };
  const { type, value } = raw as { type?: unknown; value?: unknown };
  const t = typeof type === 'string' ? type : '';
  if (t === 'BYTES') {
    const bytes = typeof value === 'string' ? fromBase64(value) : undefined;
    return bytes ? { type: t, bytes } : { type: t };
  }
  return { type: t, value };
}

/**
 * The lookup's answer → records. A missing name (`NOT_FOUND`) or a deleted record is left out; any
 * other per-record error fails the whole lookup, since a record we couldn't read might be the newest
 * state or a deactivate. A record of another type keeps no field, so the reader ignores it.
 */
export function parseLookup(status: number, text: string, names: readonly string[]): LookupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: status === 200 ? 'malformed' : `http.${status}` };
  }
  if (status !== 200) {
    const code = (json as { serverErrorCode?: unknown } | null)?.serverErrorCode;
    return { ok: false, reason: typeof code === 'string' ? code : `http.${status}` };
  }
  const list = (json as { records?: unknown } | null)?.records;
  if (!Array.isArray(list)) return { ok: false, reason: 'malformed' };
  const records: ReaderRecord[] = [];
  for (const entry of list) {
    if (typeof entry !== 'object' || entry === null) return { ok: false, reason: 'malformed' };
    const e = entry as Record<string, unknown>;
    if (typeof e.serverErrorCode === 'string') {
      if (e.serverErrorCode === 'NOT_FOUND') continue;
      return { ok: false, reason: e.serverErrorCode };
    }
    if (typeof e.recordName !== 'string') return { ok: false, reason: 'malformed' };
    if (e.deleted === true) continue;
    const fields: Record<string, FieldValue> = {};
    if (e.recordType === RECORD_TYPE && typeof e.fields === 'object' && e.fields !== null) {
      for (const [k, v] of Object.entries(e.fields as Record<string, unknown>)) fields[k] = field(v);
    }
    records.push({ name: e.recordName, fields });
  }
  if (records.length > names.length) return { ok: false, reason: 'malformed' };
  return { ok: true, records };
}

/** The one request (DESIGN §6 item 2). */
export async function lookup(names: readonly string[], c: CloudKitConfig, fetchFn: typeof fetch = fetch): Promise<LookupResult> {
  const init: RequestInit = {
    method: 'POST',
    // A CORS-simple request: a text/plain body and no custom header, so no preflight (DESIGN §3 C4).
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ records: names.map((recordName) => ({ recordName })) }),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    redirect: 'error',
    mode: 'cors',
  };
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) init.signal = AbortSignal.timeout(TIMEOUT_MS);
  let response: Response;
  let text: string;
  try {
    response = await fetchFn(lookupUrl(c), init);
    text = await response.text();
  } catch {
    return { ok: false, reason: 'network' };
  }
  return parseLookup(response.status, text, names);
}
