// Every state of DESIGN §5, built with createElement and textContent only: no innerHTML, so the page
// works under `require-trusted-types-for 'script'` and no card or fragment text can become markup. The
// only links are the page's own tel: and sms: for numbers that pass dialable().
import type { Strings } from './lang';
import { ago, dialable, fill, groupDigits, type LocalTime, seen, since, writtenOn } from './text';

export interface Contact {
  name: string;
  phone?: string;
  label?: string;
}

export interface Medication {
  text: string;
  canSkip?: boolean;
}

export interface Lost {
  since: LocalTime;
  area?: string;
  description?: string;
  /** The family's words to the finder (Spec §15.3 r3), shown as a quote, plain text only. */
  message?: string;
  lastSeenLabel?: string;
  lastSeenAt?: LocalTime;
}

/** What the page shows of a card: a published one (§15.3) or a chip's copy (§15.5, no photo, no lost). */
export interface CardView {
  name: string;
  species: string;
  breed?: string;
  phone?: string;
  alternate?: Contact;
  allergies: readonly string[];
  medication: readonly Medication[];
  vet?: Contact;
  microchip?: string;
  lost?: Lost;
}

/** A photo that passed the reader's checks, as a blob: URL the caller made from the record's bytes. */
export interface PhotoView {
  url: string;
  width: number;
  height: number;
}

/** A control character: card text can't hold one (§15.3), so it can't collide with a name. */
const SPLIT = '\u0000';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function link(href: string, className: string, text: string): HTMLAnchorElement {
  const a = el('a', className, text);
  a.href = href;
  return a;
}

function species(code: string, s: Strings): string {
  if (code === 'dog') return s['species.dog'];
  if (code === 'cat') return s['species.cat'];
  return code;
}

function footer(lines: readonly string[], s: Strings): HTMLElement {
  const f = el('footer', 'footer');
  for (const line of lines) f.append(el('p', undefined, line));
  f.append(el('p', 'privacy', s.privacy));
  return f;
}

function swap(main: HTMLElement, className: string, state: string, parts: readonly HTMLElement[], title: string): void {
  main.className = className;
  main.replaceChildren(...parts);
  document.body.dataset.state = state;
  document.title = title;
}

/** A one-line state: A (bare), D, G or H. The heading takes focus only when [announce] (the page changed). */
export function showNotice(main: HTMLElement, state: string, message: string, s: Strings, announce = false): void {
  const h1 = el('h1', undefined, message);
  h1.tabIndex = -1;
  swap(main, 'page notice', state, [el('p', 'chip', state === 'bare' ? s.chip : s['title.page']), h1, footer([], s)], s['title.page']);
  if (announce) h1.focus();
}

/** State F: the refusal above A's text, and nothing from the fragment. */
export function showRefusal(main: HTMLElement, s: Strings): void {
  showNotice(main, 'bare', s.bare, s);
  const note = el('p', 'refused', s.refused);
  note.setAttribute('role', 'alert');
  main.querySelector('.chip')?.after(note);
  document.body.dataset.state = 'refused';
}

function hero(card: CardView, s: Strings, photo: PhotoView | undefined): { header: HTMLElement; h1: HTMLElement } {
  const header = el('header', 'hero');
  if (photo) {
    const img = el('img', 'photo');
    img.src = photo.url;
    img.alt = fill(s['photo.alt'], { name: card.name });
    img.width = photo.width;
    img.height = photo.height;
    header.append(img);
  }
  const h1 = el('h1', undefined, fill(s.hello, { name: card.name }));
  h1.tabIndex = -1;
  header.append(h1, el('p', 'tagline', fill(s.tagline, { breed: card.breed ?? species(card.species, s) })));
  return { header, h1 };
}

function lostBand(lost: Lost, nowMs: number, s: Strings): HTMLElement {
  const band = el('section', 'lost-band');
  band.setAttribute('aria-labelledby', 'lost-title');
  const h2 = el('h2', undefined, s['lost.title']);
  h2.id = 'lost-title';
  const when = since(lost.since, nowMs, s);
  const line = lost.area ? fill(s['lost.line.area'], { since: when, area: lost.area }) : fill(s['lost.line'], { since: when });
  band.append(h2, el('p', undefined, line));
  if (lost.description) band.append(el('p', 'lost-description', lost.description));
  if (lost.message) {
    const said = el('figure', 'lost-message');
    said.append(el('figcaption', undefined, s['lost.message.label']), el('blockquote', undefined, fill(s['lost.message'], { message: lost.message })));
    band.append(said);
  }
  return band;
}

/** Send where I am (DESIGN §6 item 4): hidden until where.ts shows it, which needs geolocation. */
function sendWhere(card: CardView, phone: string, s: Strings): HTMLElement {
  const box = el('div', 'where');
  box.id = 'where-block';
  box.hidden = true;
  const button = el('button', 'button primary', s.where);
  button.type = 'button';
  button.id = 'where';
  // Split around the place, so where.ts joins the parts and never fills a pet's name again.
  const [before, after] = fill(s['where.message'], { name: card.name, where: SPLIT }).split(SPLIT) as [string, string];
  Object.assign(button.dataset, { phone, before, after, finding: s['where.finding'], denied: s['where.denied'] });
  const status = el('p', 'where-status');
  status.id = 'where-status';
  status.setAttribute('role', 'status');
  const send = el('a', 'button primary', s['where.open']);
  send.id = 'where-send';
  send.hidden = true;
  box.append(button, el('p', 'hint', s['where.hint']), status, send);
  return box;
}

function actions(card: CardView, s: Strings): HTMLElement {
  const box = el('div', 'actions');
  const phone = dialable(card.phone);
  const alt = card.alternate;
  const altPhone = dialable(alt?.phone);
  if (phone) box.append(link(`tel:${phone}`, 'button primary', s.call));
  else if (card.phone) box.append(el('p', 'phone', card.phone));
  const messageTo = phone ?? altPhone;
  if (card.lost && messageTo) box.append(sendWhere(card, messageTo, s));
  if (phone) box.append(link(`sms:${phone}`, 'button', s.message));
  if (alt) {
    const label = alt.label ? fill(s['alternate.call.label'], { name: alt.name, label: alt.label }) : fill(s['alternate.call'], { name: alt.name });
    if (altPhone) box.append(link(`tel:${altPhone}`, 'button', label));
    else box.append(el('p', 'phone', alt.phone ? `${alt.name}: ${alt.phone}` : alt.name));
  }
  return box;
}

function row(dl: HTMLElement, term: string, value: string, note?: string): void {
  const dd = el('dd', undefined, value);
  if (note) dd.append(el('span', 'note', note));
  dl.append(el('dt', undefined, term), dd);
}

function section(id: string, title: string): HTMLElement {
  const sec = el('section', 'rows');
  sec.setAttribute('aria-labelledby', id);
  const h2 = el('h2', undefined, title);
  h2.id = id;
  sec.append(h2);
  return sec;
}

function lastSeen(lost: Lost, nowMs: number, s: Strings): string | undefined {
  const at = lost.lastSeenAt ? seen(lost.lastSeenAt, nowMs, s) : undefined;
  if (lost.lastSeenLabel && at) return fill(s['lastSeen.both'], { label: lost.lastSeenLabel, when: at });
  return lost.lastSeenLabel ?? at;
}

function important(card: CardView, nowMs: number, s: Strings): HTMLElement | undefined {
  const last = card.lost ? lastSeen(card.lost, nowMs, s) : undefined;
  if (!last && card.allergies.length === 0 && card.medication.length === 0 && !card.microchip) return undefined;
  const sec = section('important-title', s.important);
  const dl = el('dl');
  if (last) row(dl, s.lastSeen, last);
  for (const a of card.allergies) row(dl, s.allergy, a);
  for (const m of card.medication) row(dl, s.medication, m.text, m.canSkip === true ? s['medication.canSkip'] : undefined);
  if (card.microchip) row(dl, s.microchip, fill(s['microchip.note'], { number: groupDigits(card.microchip) }));
  sec.append(dl);
  return sec;
}

function vet(v: Contact, s: Strings): HTMLElement {
  const sec = section('vet-title', s.vet);
  const box = el('div', 'vet');
  box.append(el('p', undefined, v.name));
  const phone = dialable(v.phone);
  if (phone) box.append(link(`tel:${phone}`, 'button small', s['vet.call']));
  else if (v.phone) box.append(el('p', 'phone', v.phone));
  sec.append(box);
  return sec;
}

function body(card: CardView, nowMs: number, s: Strings, photo: PhotoView | undefined, footerLines: string[]): { parts: HTMLElement[]; h1: HTMLElement } {
  const { header, h1 } = hero(card, s, photo);
  const parts: HTMLElement[] = [el('p', 'chip', s.chip)];
  if (card.lost) parts.push(lostBand(card.lost, nowMs, s));
  parts.push(header, actions(card, s));
  const imp = important(card, nowMs, s);
  if (imp) parts.push(imp);
  if (card.vet) parts.push(vet(card.vet, s));
  parts.push(footer(footerLines, s));
  return { parts, h1 };
}

/** States B and C: a card the reader selected, "Published by my family · updated N min ago". */
export function showPublished(main: HTMLElement, card: CardView, publishedMs: number, nowMs: number, s: Strings, photo?: PhotoView): void {
  const lines = [fill(s['footer.published'], { ago: ago(publishedMs, nowMs, s) }), s['footer.address']];
  const { parts, h1 } = body(card, nowMs, s, photo, lines);
  swap(main, 'page', card.lost ? 'lost' : 'published', parts, fill(s['title.card'], { name: card.name }));
  h1.focus();
}

/** State E: the tag's copy, never called "published", with no lost band (Spec §15.5). */
export function showCopy(main: HTMLElement, card: CardView, recordedMs: number, nowMs: number, s: Strings): void {
  const lines = [fill(s['footer.copy'], { date: writtenOn(recordedMs, nowMs, s) }), s['footer.address']];
  const { parts, h1 } = body({ ...card, lost: undefined }, nowMs, s, undefined, lines);
  swap(main, 'page', 'copy', parts, fill(s['title.card'], { name: card.name }));
  h1.focus();
}
