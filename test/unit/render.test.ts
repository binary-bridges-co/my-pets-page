// The lost block's message (Spec §15.3 r3, `lost.message`) as render.ts builds it, on a fake DOM:
// a labelled quote of plain text in the lost band, never markup or a link, in English and Spanish.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkCard } from '../../src/card';
import { STRINGS } from '../../src/lang';
import { showCopy, showPublished } from '../../src/render';
import { fakeDocument, type FakeElement, FakeText } from '../support/dom';
import { card } from '../support/records';

const NOW = Date.parse('2026-11-04T23:15:00.000Z');
const PUBLISHED = '2026-11-04T23:13:00.000Z';
const MESSAGE = "She's shy, please don't chase her. Call us, there's a reward.";

function render(message: string | undefined, lang: 'en' | 'es' = 'en'): FakeElement {
  const main = fakeDocument();
  const view = checkCard(card({ published: PUBLISHED, lost: true, message }), false);
  showPublished(main as unknown as HTMLElement, view, Date.parse(PUBLISHED), NOW, STRINGS[lang]);
  return main;
}

function said(main: FakeElement): FakeElement | undefined {
  return main.byClass('lost-band')[0]?.byClass('lost-message')[0];
}

test('the message shows in the lost band, labelled and quoted, after the description', () => {
  const main = render(MESSAGE);
  const band = main.byClass('lost-band')[0] as FakeElement;
  const box = said(main) as FakeElement;
  assert.ok(box, 'a .lost-message in the band');
  assert.equal(band.elements.at(-1), box, 'the last part of the band');
  assert.ok(band.elements.indexOf(band.byClass('lost-description')[0] as FakeElement) < band.elements.indexOf(box));
  const [label, quote] = box.elements as [FakeElement, FakeElement];
  assert.equal(box.tagName, 'FIGURE');
  assert.deepEqual([label.tagName, label.textContent], ['FIGCAPTION', 'My family says:']);
  assert.deepEqual([quote.tagName, quote.textContent], ['BLOCKQUOTE', `“${MESSAGE}”`]);
});

test('the message is one text node: markup, links and placeholders stay text', () => {
  for (const message of ['<img src=x onerror=alert(1)>', 'https://example.com/reward', 'Call {name} now']) {
    const quote = (said(render(message)) as FakeElement).elements[1] as FakeElement;
    assert.equal(quote.children.length, 1, message);
    assert.ok(quote.children[0] instanceof FakeText, message);
    assert.equal(quote.textContent, `“${message}”`);
  }
});

test('Spanish label and quotes', () => {
  const box = said(render(MESSAGE, 'es')) as FakeElement;
  assert.equal(box.elements[0]?.textContent, 'Mi familia dice:');
  assert.equal(box.elements[1]?.textContent, `«${MESSAGE}»`);
});

test('no message, no block; the rest of the lost band is unchanged', () => {
  const main = render(undefined);
  assert.equal(said(main), undefined);
  assert.equal(main.byClass('lost-description')[0]?.textContent, 'Red collar');
});

test('the tag\'s copy never shows a lost band or its message', () => {
  const main = fakeDocument();
  const view = checkCard(card({ published: PUBLISHED, message: MESSAGE }), false);
  showCopy(main as unknown as HTMLElement, view, Date.parse(PUBLISHED), NOW, STRINGS.en);
  assert.equal(main.byClass('lost-band').length, 0);
  assert.ok(!main.textContent.includes(MESSAGE));
});
