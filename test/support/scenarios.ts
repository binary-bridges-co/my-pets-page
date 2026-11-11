// The recorded fake of CloudKit for the browser tests: one link per scenario, with the answer its
// lookup gets (shaped from the Web Services Reference, docs/DESIGN.md §3) and the tag fragments to
// try on it. Written to test/fixtures/scenarios.json by scripts/gen-fixtures.mjs; a unit test checks
// the committed file is what this code makes. Synthetic only.
import { recordNames } from '../../src/reader';
import { card, chipCard, fragment, lookupAnswer, operation, PHOTO, record, sha256Hex, tagKey, toBase64, utf8 } from './records';

/** The clock the browser tests fix (Playwright's page.clock). */
export const NOW = '2026-11-04T23:15:00.000Z';
const before = (minutes: number): string => new Date(Date.parse(NOW) - minutes * 60_000).toISOString();

export interface Scenario {
  id: string;
  status: number;
  /** The answer's body: JSON, or text when it isn't (a malformed answer). */
  body: unknown;
  /** Fragments (without `#`) to put on this link. */
  fragments: Record<string, string>;
}

export async function scenarios(): Promise<{ now: string; photoBase64: string; scenarios: Record<string, Scenario> }> {
  const out: Record<string, Scenario> = {};
  const photoSha = await sha256Hex(PHOTO);
  let n = 10;
  const add = async (name: string, make: (k: Awaited<ReturnType<typeof tagKey>>, names: string[]) => Promise<{ status?: number; body: unknown }>) => {
    const key = await tagKey(n++);
    const names = recordNames(key.id);
    const other = await tagKey(200 + n);
    const { status, body } = await make(key, names);
    const tagged = chipCard('Tag Dog');
    const altered = utf8(JSON.stringify(tagged).replace('Tag Dog', 'Tag Dug'));
    out[name] = {
      id: key.id,
      status: status ?? 200,
      body,
      fragments: {
        verified: await fragment(key, tagged),
        hostile: await fragment(key, chipCard('<img src=x onerror=alert(1)>')),
        otherLink: await fragment(other, tagged),
        forged: await fragment(key, tagged, { signer: other }),
        altered: await fragment(key, tagged, { sent: altered }),
        wrongTag: await fragment(key, tagged, { tag: 'mypets/public-card/v1' }),
        withLost: await fragment(key, { ...tagged, lost: { since: '2026-11-04T06:10:00-05:00' } }),
        malformed: '1.not*base64',
        linkOnly: `1.${toBase64(Uint8Array.from({ length: 16 }, (_, i) => i)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`,
      },
    };
  };
  const answer = (names: string[], ...records: Awaited<ReturnType<typeof record>>[]) => ({ body: lookupAnswer(names, records) });

  await add('published', async (k, names) => answer(names, await record(k, k.id, card({ published: before(2), photoSha256: photoSha }), { photo: PHOTO })));
  await add('publishedNoPhoto', async (k, names) => answer(names, await record(k, k.id, card({ published: before(2) }))));
  await add('lost', async (k, names) => answer(names, await record(k, k.id, card({ published: before(2), lost: true, photoSha256: photoSha }), { photo: PHOTO })));
  await add('lostLongName', async (k, names) =>
    answer(names, await record(k, k.id, card({ published: before(2), lost: true, name: 'Supercalifragilisticexpialidociouspuppy' }))),
  );
  await add('hostile', async (k, names) =>
    answer(names, await record(k, k.id, card({ published: before(2), name: '<img src=x onerror=alert(1)>', phone: '1+2+3' }))),
  );
  await add('photoMismatch', async (k, names) =>
    answer(names, await record(k, k.id, card({ published: before(2), photoSha256: '0'.repeat(64) }), { photo: PHOTO })),
  );
  await add('newerSuccessor', async (k, names) =>
    answer(names, await record(k, k.id, card({ published: before(90), name: 'Old Dog' })), await record(k, `${k.id}.1`, card({ published: before(2), name: 'New Dog' }))),
  );
  await add('deactivated', async (k, names) =>
    answer(names, await record(k, k.id, card({ published: before(1) })), await record(k, `${k.id}.2`, operation('deactivate', k.id, before(60)))),
  );
  await add('unpublished', async (k, names) => answer(names, await record(k, k.id, operation('unpublish', k.id, before(2)))));
  await add('forgedOnly', async (k, names) => answer(names, await record(k, k.id, card({ published: before(2), name: 'Forged Dog' }), { signer: await tagKey(250) })));
  await add('notFound', async (_k, names) => answer(names));
  await add('throttled', async () => ({ status: 429, body: { uuid: 'test', serverErrorCode: 'THROTTLED', reason: 'slow down', retryAfter: 30 } }));
  await add('malformed', async () => ({ body: 'not json' }));
  // Spec §15.3 r3: a lost card with the family's message (`v` 2), and the longest message at phone width.
  await add('lostMessage', async (k, names) =>
    answer(names, await record(k, k.id, card({ published: before(2), message: "She's shy, please don't chase her. Call us, there's a reward.", photoSha256: photoSha }), { photo: PHOTO })),
  );
  await add('lostMessageLong', async (k, names) => answer(names, await record(k, k.id, card({ published: before(2), message: 'm'.repeat(200) }))));
  return { now: NOW, photoBase64: toBase64(PHOTO), scenarios: out };
}
