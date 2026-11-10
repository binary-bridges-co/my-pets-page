import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pickLanguage, STRINGS } from '../../src/lang';
import { ago, dialable, fill, groupDigits, localTime, seen, since } from '../../src/text';

const en = STRINGS.en;
const es = STRINGS.es;
const NOW = Date.parse('2026-11-04T23:15:00.000Z'); // 18:15 in Bogotá (-05:00)

test('both languages have the same keys and no empty string', () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  for (const s of [en, es]) for (const [k, v] of Object.entries(s)) assert.ok(v.length > 0, k);
  assert.equal(en.months.split(',').length, 12);
  assert.equal(es.months.split(',').length, 12);
});

test('the location message has its place placeholder in both languages', () => {
  for (const s of [en, es]) {
    assert.ok(s['where.message'].includes('{where}'));
    assert.ok(s['where.message'].includes('{name}'));
  }
});

test('fill ignores inherited names', () => {
  assert.equal(fill('{constructor}', {}), '{constructor}');
});

test('the privacy line is the owner wording (Q-R2-2)', () => {
  assert.equal(en.privacy, "My Pets doesn't know when the tag is scanned. Like any website, the page's host and Apple's iCloud see the visitor's internet address.");
});

test('the language comes from the browser list, English when nothing matches', () => {
  assert.equal(pickLanguage(['es-CO', 'en']), 'es');
  assert.equal(pickLanguage(['fr-FR', 'ES']), 'es');
  assert.equal(pickLanguage(['en-GB', 'es']), 'en');
  assert.equal(pickLanguage(['de', 'fr']), 'en');
  assert.equal(pickLanguage([]), 'en');
});

test('fill fills once and leaves unknown placeholders', () => {
  assert.equal(fill('Hi, {name} {other}', { name: '{name}' }), 'Hi, {name} {other}');
});

test('only clean numbers become tel: links', () => {
  assert.equal(dialable('+1 (555) 0100'), '+15550100');
  assert.equal(dialable('555-0102'), '5550102');
  assert.equal(dialable('12'), undefined);
  assert.equal(dialable('+1 555 0100 ext 2'), undefined);
  assert.equal(dialable('javascript:alert(1)'), undefined);
  assert.equal(dialable(undefined), undefined);
});

test('a digits-only microchip reads in threes', () => {
  assert.equal(groupDigits('985112004563210'), '985 112 004 563 210');
  assert.equal(groupDigits('AB-12'), 'AB-12');
});

test('updated N ago from the signed published, today when the clock is behind', () => {
  assert.equal(ago(NOW - 20_000, NOW, en), 'just now');
  assert.equal(ago(NOW - 2 * 60_000, NOW, en), '2 min ago');
  assert.equal(ago(NOW - 3 * 3_600_000, NOW, en), '3 h ago');
  assert.equal(ago(NOW - 30 * 3_600_000, NOW, en), '1 day ago');
  assert.equal(ago(NOW - 5 * 86_400_000, NOW, en), '5 days ago');
  assert.equal(ago(NOW + 60_000, NOW, en), 'today');
  assert.equal(ago(NOW - 2 * 60_000, NOW, es), 'hace 2 min');
});

test('since and last seen are judged in the offset they were written in', () => {
  const today = localTime('2026-11-04T06:10:00-05:00');
  const yesterday = localTime('2026-11-03T21:00:00-05:00');
  const earlier = localTime('2026-11-01T08:05:00-05:00');
  assert.ok(today && yesterday && earlier);
  assert.equal(since(today, NOW, en), 'Since today, 4 Nov');
  assert.equal(since(yesterday, NOW, en), 'Since yesterday, 3 Nov');
  assert.equal(since(earlier, NOW, en), 'Since 1 Nov');
  assert.equal(since(today, NOW, es), 'Desde hoy, 4 de noviembre');
  assert.equal(seen(today, NOW, en), 'today, 6:10 AM');
  assert.equal(seen(yesterday, NOW, en), 'yesterday, 9:00 PM');
  // 23:15 UTC is already 5 Nov in Tokyo: a +09:00 time on 4 Nov is "yesterday" there.
  const tokyo = localTime('2026-11-04T12:00:00+09:00');
  assert.ok(tokyo);
  assert.equal(seen(tokyo, NOW, en), 'yesterday, 12:00 PM');
  assert.equal(localTime('2026-11-04T06:10:00Z'), undefined);
  assert.equal(localTime('2026-13-04T06:10:00-05:00'), undefined);
  assert.equal(localTime('2026-11-04T06:10:00+15:00'), undefined);
});
