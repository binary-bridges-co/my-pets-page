// Plain-text helpers. Every result only ever goes into textContent or an attribute we own.
import type { Strings } from './lang';

/** Fills `{name}` placeholders in one pass, so a filled value is never filled again. */
export function fill(template: string, args: Readonly<Record<string, string>>): string {
  return template.replace(/\{([a-z]+)\}/g, (whole, key: string) => (key in args ? (args[key] as string) : whole));
}

/** The server's Phones.dialable rule: optional leading +, 3 to 20 digits after the separators a card may use. */
export function dialable(phone: string | undefined): string | undefined {
  if (phone === undefined) return undefined;
  const stripped = phone.replace(/[ \-().]/g, '');
  return /^\+?[0-9]{3,20}$/.test(stripped) ? stripped : undefined;
}

/** A microchip of digits reads in threes ("985 112 004 563"); anything else is shown as stored. */
export function groupDigits(text: string): string {
  return /^[0-9]+$/.test(text) ? (text.match(/.{1,3}/g) as string[]).join(' ') : text;
}

/** A calendar day, as y-m-d numbers. */
export interface Day {
  y: number;
  m: number;
  d: number;
}

const MINUTE = 60_000;
const DAY_MS = 24 * 60 * MINUTE;

function dayOf(ms: number): Day {
  const t = new Date(ms);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function sameDay(a: Day, b: Day): boolean {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}

/** "2 Oct", or "2 Oct 2025" in another year than [today]. */
export function date(day: Day, today: Day, s: Strings): string {
  const month = s.months.split(',')[day.m - 1] as string;
  const args = { day: String(day.d), month, year: String(day.y) };
  return fill(day.y === today.y ? s.date : s['date.year'], args);
}

function time(h: number, mi: number, s: Strings): string {
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(mi).padStart(2, '0')} ${h < 12 ? s['time.am'] : s['time.pm']}`;
}

/** "just now", "2 min ago", "3 h ago", "1 day ago", "5 days ago"; "today" when the clock is behind [from]. */
export function ago(fromMs: number, nowMs: number, s: Strings): string {
  const minutes = Math.floor((nowMs - fromMs) / MINUTE);
  if (nowMs < fromMs) return s['ago.today'];
  if (minutes < 1) return s['ago.now'];
  if (minutes < 60) return fill(s['ago.minutes'], { n: String(minutes) });
  if (minutes < 24 * 60) return fill(s['ago.hours'], { n: String(Math.floor(minutes / 60)) });
  if (minutes < 48 * 60) return s['ago.day'];
  return fill(s['ago.days'], { n: String(Math.floor(minutes / (24 * 60))) });
}

/** A §1.2 datetime with its offset, kept in that offset (the owner's local time). */
export interface LocalTime {
  day: Day;
  h: number;
  mi: number;
  offsetMinutes: number;
}

const DATETIME = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):[0-9]{2}([+-])([0-9]{2}):([0-9]{2})$/;

/** Reads a datetime that already passed the card rules; undefined for anything else. */
export function localTime(text: string): LocalTime | undefined {
  const m = DATETIME.exec(text);
  if (!m) return undefined;
  const n = m.slice(1).map((x, i) => (i === 5 ? 0 : Number(x)));
  const sign = m[6] === '-' ? -1 : 1;
  return {
    day: { y: n[0] as number, m: n[1] as number, d: n[2] as number },
    h: n[3] as number,
    mi: n[4] as number,
    offsetMinutes: sign * ((n[6] as number) * 60 + (n[7] as number)),
  };
}

/** Today and yesterday in the given offset. */
function todayIn(offsetMinutes: number, nowMs: number): { today: Day; yesterday: Day } {
  const shifted = nowMs + offsetMinutes * MINUTE;
  return { today: dayOf(shifted), yesterday: dayOf(shifted - DAY_MS) };
}

/** "Since today, 4 Nov" / "Since yesterday, 3 Nov" / "Since 1 Nov", judged in the offset it was written in. */
export function since(at: LocalTime, nowMs: number, s: Strings): string {
  const { today, yesterday } = todayIn(at.offsetMinutes, nowMs);
  const shown = date(at.day, today, s);
  if (sameDay(at.day, today)) return fill(s['lost.since.today'], { date: shown });
  if (sameDay(at.day, yesterday)) return fill(s['lost.since.yesterday'], { date: shown });
  return fill(s['lost.since.date'], { date: shown });
}

/** "today, 6:40 AM", "yesterday, …" or "2 Nov, …", in the offset it was written in. */
export function seen(at: LocalTime, nowMs: number, s: Strings): string {
  const { today, yesterday } = todayIn(at.offsetMinutes, nowMs);
  const day = sameDay(at.day, today) ? s['day.today'] : sameDay(at.day, yesterday) ? s['day.yesterday'] : date(at.day, today, s);
  return fill(s.when, { day, time: time(at.h, at.mi, s) });
}

/** The day a `recorded` UTC instant falls on in the visitor's own time zone ("written 2 Oct"). */
export function writtenOn(recordedMs: number, nowMs: number, s: Strings): string {
  const at = new Date(recordedMs);
  const now = new Date(nowMs);
  const day = { y: at.getFullYear(), m: at.getMonth() + 1, d: at.getDate() };
  return date(day, { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }, s);
}
