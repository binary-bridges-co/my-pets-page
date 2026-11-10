// test/unit/text.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

// src/strings/en.json
var en_default = {
  months: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
  date: "{day} {month}",
  "date.year": "{day} {month} {year}",
  "time.am": "AM",
  "time.pm": "PM",
  "day.today": "today",
  "day.yesterday": "yesterday",
  when: "{day}, {time}",
  "title.card": "{name} \xB7 My Pets",
  "title.page": "My Pets",
  chip: "Web page \xB7 no app needed",
  hello: "Hi, I'm {name}",
  tagline: "{breed} \xB7 I have a family waiting for me",
  "species.dog": "Dog",
  "species.cat": "Cat",
  "photo.alt": "Photo of {name}",
  call: "Call my family",
  message: "Send my family a message",
  "alternate.call": "Call {name}",
  "alternate.call.label": "Call {name} ({label})",
  where: "Send where I am",
  "where.hint": "A message with your location opens for you to send.",
  "where.finding": "Finding where you are\u2026",
  "where.denied": "Your location isn't available. You can still call or send a message.",
  "where.open": "Open the message",
  "where.message": "I found {name}. I'm here: {where}",
  "lost.title": "I got lost and they're looking for me",
  "lost.since.today": "Since today, {date}",
  "lost.since.yesterday": "Since yesterday, {date}",
  "lost.since.date": "Since {date}",
  "lost.line": "{since}. Please let my family know.",
  "lost.line.area": "{since}, near {area}. Please let my family know.",
  important: "Important",
  allergy: "Allergy",
  medication: "Medication",
  "medication.canSkip": "Can skip a day",
  microchip: "Microchip",
  "microchip.note": "{number} \xB7 any vet can read it",
  lastSeen: "Last seen",
  "lastSeen.both": "{label} \xB7 {when}",
  vet: "My vet",
  "vet.call": "Call",
  "footer.published": "Published by my family \xB7 updated {ago}.",
  "ago.now": "just now",
  "ago.minutes": "{n} min ago",
  "ago.hours": "{n} h ago",
  "ago.day": "1 day ago",
  "ago.days": "{n} days ago",
  "footer.address": "The family's address isn't shown.",
  "footer.copy": "Details on the tag \xB7 written {date}. My Pets hasn't checked who wrote them.",
  bare: "This tag's details are on its NFC chip. Hold your phone to the tag, or call the number engraved on its back.",
  refused: "These details don't match this tag's link",
  deactivated: "This tag is no longer active.",
  notATag: "This isn't a My Pets tag link.",
  unavailable: "We can't show this card right now. Call the number engraved on the tag.",
  home: "My Pets helps lost pets get home. This site shows the cards their families publish.",
  "ago.today": "today",
  privacy: "My Pets doesn't know when the tag is scanned. Like any website, the page's host and Apple's iCloud see the visitor's internet address."
};

// src/strings/es.json
var es_default = {
  months: "enero,febrero,marzo,abril,mayo,junio,julio,agosto,septiembre,octubre,noviembre,diciembre",
  date: "{day} de {month}",
  "date.year": "{day} de {month} de {year}",
  "time.am": "a. m.",
  "time.pm": "p. m.",
  "day.today": "hoy",
  "day.yesterday": "ayer",
  when: "{day}, {time}",
  "title.card": "{name} \xB7 My Pets",
  "title.page": "My Pets",
  chip: "P\xE1gina web \xB7 no necesitas la app",
  hello: "Hola, soy {name}",
  tagline: "{breed} \xB7 Tengo una familia que me espera",
  "species.dog": "Perro",
  "species.cat": "Gato",
  "photo.alt": "Foto de {name}",
  call: "Llama a mi familia",
  message: "Env\xEDa un mensaje a mi familia",
  "alternate.call": "Llama a {name}",
  "alternate.call.label": "Llama a {name} ({label})",
  where: "Env\xEDa d\xF3nde estoy",
  "where.hint": "Se abre un mensaje con tu ubicaci\xF3n para que t\xFA lo env\xEDes.",
  "where.finding": "Buscando d\xF3nde est\xE1s\u2026",
  "where.denied": "No pudimos obtener tu ubicaci\xF3n. Aun as\xED puedes llamar o enviar un mensaje.",
  "where.open": "Abrir el mensaje",
  "where.message": "Encontr\xE9 a {name}. Estoy aqu\xED: {where}",
  "lost.title": "Me perd\xED y me est\xE1n buscando",
  "lost.since.today": "Desde hoy, {date}",
  "lost.since.yesterday": "Desde ayer, {date}",
  "lost.since.date": "Desde el {date}",
  "lost.line": "{since}. Por favor, av\xEDsale a mi familia.",
  "lost.line.area": "{since}, cerca de {area}. Por favor, av\xEDsale a mi familia.",
  important: "Importante",
  allergy: "Alergia",
  medication: "Medicamento",
  "medication.canSkip": "Puede saltarse un d\xEDa",
  microchip: "Microchip",
  "microchip.note": "{number} \xB7 cualquier veterinario puede leerlo",
  lastSeen: "Visto por \xFAltima vez",
  "lastSeen.both": "{label} \xB7 {when}",
  vet: "Mi veterinario",
  "vet.call": "Llamar",
  "footer.published": "Publicado por mi familia \xB7 actualizado {ago}.",
  "ago.now": "hace un momento",
  "ago.minutes": "hace {n} min",
  "ago.hours": "hace {n} h",
  "ago.day": "hace 1 d\xEDa",
  "ago.days": "hace {n} d\xEDas",
  "footer.address": "La direcci\xF3n de la familia no se muestra.",
  "footer.copy": "Datos de la placa \xB7 escritos el {date}. My Pets no ha verificado qui\xE9n los escribi\xF3.",
  bare: "Los datos de esta placa est\xE1n en su chip NFC. Acerca tu tel\xE9fono a la placa o llama al n\xFAmero grabado en el reverso.",
  refused: "Estos datos no coinciden con el enlace de esta placa",
  deactivated: "Esta placa ya no est\xE1 activa.",
  notATag: "Este no es un enlace de placa de My Pets.",
  unavailable: "No podemos mostrar esta ficha ahora. Llama al n\xFAmero grabado en la placa.",
  home: "My Pets ayuda a que las mascotas perdidas vuelvan a casa. Este sitio muestra las fichas que publican sus familias.",
  "ago.today": "hoy",
  privacy: "My Pets no sabe cu\xE1ndo se escanea la placa. Como en cualquier sitio web, quien aloja la p\xE1gina e iCloud de Apple ven la direcci\xF3n de internet de quien la visita."
};

// src/lang.ts
var STRINGS = { en: en_default, es: es_default };
function pickLanguage(languages) {
  for (const tag of languages) {
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (primary === "en" || primary === "es") return primary;
  }
  return "en";
}

// src/text.ts
function fill(template, args) {
  return template.replace(/\{([a-z]+)\}/g, (whole, key) => key in args ? args[key] : whole);
}
function dialable(phone) {
  if (phone === void 0) return void 0;
  const stripped = phone.replace(/[ \-().]/g, "");
  return /^\+?[0-9]{3,20}$/.test(stripped) ? stripped : void 0;
}
function groupDigits(text) {
  return /^[0-9]+$/.test(text) ? text.match(/.{1,3}/g).join(" ") : text;
}
var MINUTE = 6e4;
var DAY_MS = 24 * 60 * MINUTE;
function dayOf(ms) {
  const t = new Date(ms);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
function sameDay(a, b) {
  return a.y === b.y && a.m === b.m && a.d === b.d;
}
function date(day, today, s) {
  const month = s.months.split(",")[day.m - 1];
  const args = { day: String(day.d), month, year: String(day.y) };
  return fill(day.y === today.y ? s.date : s["date.year"], args);
}
function time(h, mi, s) {
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(mi).padStart(2, "0")} ${h < 12 ? s["time.am"] : s["time.pm"]}`;
}
function ago(fromMs, nowMs, s) {
  const minutes = Math.floor((nowMs - fromMs) / MINUTE);
  if (nowMs < fromMs) return s["ago.today"];
  if (minutes < 1) return s["ago.now"];
  if (minutes < 60) return fill(s["ago.minutes"], { n: String(minutes) });
  if (minutes < 24 * 60) return fill(s["ago.hours"], { n: String(Math.floor(minutes / 60)) });
  if (minutes < 48 * 60) return s["ago.day"];
  return fill(s["ago.days"], { n: String(Math.floor(minutes / (24 * 60))) });
}
var DATETIME = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):[0-9]{2}([+-])([0-9]{2}):([0-9]{2})$/;
function localTime(text) {
  const m = DATETIME.exec(text);
  if (!m) return void 0;
  const n = m.slice(1).map((x, i) => i === 5 ? 0 : Number(x));
  const sign = m[6] === "-" ? -1 : 1;
  return {
    day: { y: n[0], m: n[1], d: n[2] },
    h: n[3],
    mi: n[4],
    offsetMinutes: sign * (n[6] * 60 + n[7])
  };
}
function todayIn(offsetMinutes, nowMs) {
  const shifted = nowMs + offsetMinutes * MINUTE;
  return { today: dayOf(shifted), yesterday: dayOf(shifted - DAY_MS) };
}
function since(at, nowMs, s) {
  const { today, yesterday } = todayIn(at.offsetMinutes, nowMs);
  const shown = date(at.day, today, s);
  if (sameDay(at.day, today)) return fill(s["lost.since.today"], { date: shown });
  if (sameDay(at.day, yesterday)) return fill(s["lost.since.yesterday"], { date: shown });
  return fill(s["lost.since.date"], { date: shown });
}
function seen(at, nowMs, s) {
  const { today, yesterday } = todayIn(at.offsetMinutes, nowMs);
  const day = sameDay(at.day, today) ? s["day.today"] : sameDay(at.day, yesterday) ? s["day.yesterday"] : date(at.day, today, s);
  return fill(s.when, { day, time: time(at.h, at.mi, s) });
}

// test/unit/text.test.ts
var en = STRINGS.en;
var es = STRINGS.es;
var NOW = Date.parse("2026-11-04T23:15:00.000Z");
test("both languages have the same keys and no empty string", () => {
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  for (const s of [en, es]) for (const [k, v] of Object.entries(s)) assert.ok(v.length > 0, k);
  assert.equal(en.months.split(",").length, 12);
  assert.equal(es.months.split(",").length, 12);
});
test("the privacy line is the owner wording (Q-R2-2)", () => {
  assert.equal(en.privacy, "My Pets doesn't know when the tag is scanned. Like any website, the page's host and Apple's iCloud see the visitor's internet address.");
});
test("the language comes from the browser list, English when nothing matches", () => {
  assert.equal(pickLanguage(["es-CO", "en"]), "es");
  assert.equal(pickLanguage(["fr-FR", "ES"]), "es");
  assert.equal(pickLanguage(["en-GB", "es"]), "en");
  assert.equal(pickLanguage(["de", "fr"]), "en");
  assert.equal(pickLanguage([]), "en");
});
test("fill fills once and leaves unknown placeholders", () => {
  assert.equal(fill("Hi, {name} {other}", { name: "{name}" }), "Hi, {name} {other}");
});
test("only clean numbers become tel: links", () => {
  assert.equal(dialable("+1 (555) 0100"), "+15550100");
  assert.equal(dialable("555-0102"), "5550102");
  assert.equal(dialable("12"), void 0);
  assert.equal(dialable("+1 555 0100 ext 2"), void 0);
  assert.equal(dialable("javascript:alert(1)"), void 0);
  assert.equal(dialable(void 0), void 0);
});
test("a digits-only microchip reads in threes", () => {
  assert.equal(groupDigits("985112004563210"), "985 112 004 563 210");
  assert.equal(groupDigits("AB-12"), "AB-12");
});
test("updated N ago from the signed published, today when the clock is behind", () => {
  assert.equal(ago(NOW - 2e4, NOW, en), "just now");
  assert.equal(ago(NOW - 2 * 6e4, NOW, en), "2 min ago");
  assert.equal(ago(NOW - 3 * 36e5, NOW, en), "3 h ago");
  assert.equal(ago(NOW - 30 * 36e5, NOW, en), "1 day ago");
  assert.equal(ago(NOW - 5 * 864e5, NOW, en), "5 days ago");
  assert.equal(ago(NOW + 6e4, NOW, en), "today");
  assert.equal(ago(NOW - 2 * 6e4, NOW, es), "hace 2 min");
});
test("since and last seen are judged in the offset they were written in", () => {
  const today = localTime("2026-11-04T06:10:00-05:00");
  const yesterday = localTime("2026-11-03T21:00:00-05:00");
  const earlier = localTime("2026-11-01T08:05:00-05:00");
  assert.ok(today && yesterday && earlier);
  assert.equal(since(today, NOW, en), "Since today, 4 Nov");
  assert.equal(since(yesterday, NOW, en), "Since yesterday, 3 Nov");
  assert.equal(since(earlier, NOW, en), "Since 1 Nov");
  assert.equal(since(today, NOW, es), "Desde hoy, 4 de noviembre");
  assert.equal(seen(today, NOW, en), "today, 6:10 AM");
  assert.equal(seen(yesterday, NOW, en), "yesterday, 9:00 PM");
  const tokyo = localTime("2026-11-04T12:00:00+09:00");
  assert.ok(tokyo);
  assert.equal(seen(tokyo, NOW, en), "yesterday, 12:00 PM");
  assert.equal(localTime("2026-11-04T06:10:00Z"), void 0);
});
