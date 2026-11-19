// The homepage's words (plan § Copy, #261, #266, #273): every visible string sits in
// site/src/content/en.ts or comes from site/src/lib/launch.ts, and both are held to the public rules here.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixtureConfig, realConfig } from '../../site/src/config/launch';
import * as copy from '../../site/src/content/en';
import { badge, type LaunchConfig, pressContact, priceLines, sitePrivacyLine } from '../../site/src/lib/launch';

const { DISCLAIMER, FAQ, ORIGIN, PRICE, PRIVACY, PROMISE, PROOF_POINTS, ROADMAP } = copy;

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

const dated: LaunchConfig = { ...realConfig, launchPrice: { ...realConfig.launchPrice, endsOn: '2027-03-01' } };
const generated = [realConfig, fixtureConfig, dated, { ...realConfig, appStore: { state: 'available' as const, id: '1' } }].flatMap((c) => [
  sitePrivacyLine(c),
  ...strings(badge(c)),
  ...strings(pressContact(c)),
  ...strings(priceLines(c, new Date('2027-01-01T00:00:00Z'))),
  ...strings(priceLines(c, new Date('2027-06-01T00:00:00Z'))),
]);
const all = [...strings(Object.entries(copy).filter(([name]) => name !== 'DISCLAIMER').map(([, v]) => v)), ...generated];

const BANNED_WORDS = ['hash', 'chain', 'signature', 'signed', 'blockchain', 'crypto', 'immutable', 'append-only', 'AI', 'on-device model'];
// Pet-app and pet-device brands named in the decisions or likely in copy, and the roadmap's working name.
const BANNED_NAMES = [
  'PetLibro', 'Petcube', 'Furbo', 'Whistle', 'Tractive', 'Halo', 'PetSafe', 'Sure Petcare', 'Litter-Robot', 'Whisker', '11pets',
  'PetDesk', 'VitusVet', 'Pawprint', 'Garmin', 'Starlink', 'AirTag', 'Open Pet Record',
];
const ALLOWED_NAMES = ['iPhone', 'iPad', 'Mac', 'Apple Watch', 'iCloud', 'App Store', 'Safari', 'Siri', 'Live Activity', 'Android', 'Binary Bridges', 'My Pets'];
const word = (w: string) => new RegExp(`(^|[^\\p{L}\\p{N}-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}-])`, 'iu');

test('the copy module has text to check', () => {
  assert.ok(all.length > 60, `${all.length} strings`);
});

test('no technical word from the banned list (#261)', () => {
  for (const s of all) for (const w of BANNED_WORDS) assert.ok(!word(w).test(s), `"${w}" in: ${s}`);
});

test('no pet-app or device brand, and not the working name of the format', () => {
  for (const s of all) for (const n of BANNED_NAMES) assert.ok(!word(n).test(s), `"${n}" in: ${s}`);
});

test('the allowed platform names do not trip the rules', () => {
  for (const n of ALLOWED_NAMES) {
    for (const w of [...BANNED_WORDS, ...BANNED_NAMES]) assert.ok(!word(w).test(n), `${n} trips ${w}`);
  }
  assert.ok(word('AI').test('Built with AI.'), 'the rule itself works');
});

test('diagnose and treat appear only in the disclaimer, which is the #266 sentence', () => {
  assert.equal(DISCLAIMER, "My Pets is a record-keeping app. It does not diagnose or treat. Always follow your veterinarian's advice.");
  for (const s of all) assert.ok(!/diagnos|\btreat/i.test(s), s);
});

test('no emoji and no typed arrow', () => {
  for (const s of all) assert.ok(!/\p{Extended_Pictographic}|->|=>|<-|[←-⇿]/u.test(s), s);
});

test('the promise, with its one accent phrase', () => {
  assert.equal(`${PROMISE.headline} ${PROMISE.tail}`, 'Every dose on time, every record yours. One payment, no subscription.');
  assert.ok(PROMISE.headline.includes(PROMISE.accent));
});

test('the four proof points, verbatim and in order (#261, #266)', () => {
  assert.deepEqual(
    PROOF_POINTS.map((p) => p.text),
    [
      'Say what the vet said. My Pets drafts the dose plan for you to check, then sets the alarms. They ring even on silent.',
      'A record you own and your vet can verify, on your iPhone and in your iCloud.',
      'No account, no subscription, one payment.',
      'Lost mode in two taps.',
    ],
  );
});

test('price: what one payment covers (#273) and a sourced comparison', () => {
  assert.equal(
    PRICE.coverage,
    'One payment covers My Pets on iPhone, iPad and Mac, with all its updates. Android and the clinic app will be separate products, also without subscriptions.',
  );
  assert.equal(PRICE.comparison.text, 'Pet health apps with subscriptions charge about US$20-50 a year.');
  assert.equal(PRICE.comparison.note, 'Typical yearly prices of pet health record apps on the US App Store, checked November 2026.');
});

test('privacy: no Binary Bridges server, the lost-mode exception, no account; the site keeps nothing', () => {
  assert.equal(
    PRIVACY.body,
    "Your pet's data never goes to a Binary Bridges server. Records stay on your iPhone and in your own iCloud, except the lost-pet card you choose to publish in lost mode. There is no account to create.",
  );
  assert.equal(PRIVACY.site, 'This site sets no cookies and stores nothing.');
});

test('origin: the two problems, signed by the developer (owner decision 3)', () => {
  assert.ok(ORIGIN.story.includes('In her first year as a vet nurse, my wife kept seeing the same two problems: medication given wrong and vaccines forgotten.'));
  assert.equal(ORIGIN.signature, 'The developer of My Pets, Binary Bridges');
});

test('roadmap: four groups and their items exactly as #273, no dates', () => {
  assert.deepEqual(
    ROADMAP.groups.map((g) => [g.name, g.items.map((i) => i.text)]),
    [
      ['Now', ['iPhone and iPad']],
      ['Next', ['Spanish', 'Mac', 'Sitters can mark doses', 'Apple Watch (mark a dose from the wrist)']],
      [
        'Later',
        ['Android', 'The open record format for apps and devices', 'A page where vets check a record', 'Bring your records in (from other apps or a photo of the paper vaccination card)'],
      ],
      ['Exploring', ['A clinic app with no subscription', 'Open prototype devices that use the format', 'Satellite help for lost pets']],
    ],
  );
  const notes = ROADMAP.groups.flatMap((g) => g.items.map((i) => i.note ?? ''));
  assert.ok(
    notes.includes(
      "Today your pet's feeder, fountain, tracker and vet each keep their own data. We are opening My Pets' record format so any app or device can share information about your pet, only with your permission.",
    ),
  );
  // #273 item 5, in the Exploring group (so its "Exploring:" prefix is the group's name).
  assert.ok(notes.includes('Helping find lost pets where there is no cell signal, with open collar devices.'));
  for (const s of strings(ROADMAP)) assert.ok(!/\b(19|20)\d\d\b|\b(Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(s), s);
});

test('FAQ: the questions of the plan; the vet question answers with the disclaimer', () => {
  assert.deepEqual(
    FAQ.items.map((i) => i.q),
    [
      'Does My Pets replace my vet?',
      "Where is my pet's data?",
      'Do I need an account?',
      'What does the one payment cover?',
      'What happens after the launch price?',
      'How does my vet check a record?',
      'Do the alarms ring on silent?',
      'What is lost mode?',
      'Is My Pets on Android?',
    ],
  );
  assert.equal(FAQ.items[0]?.a, 'DISCLAIMER');
});
