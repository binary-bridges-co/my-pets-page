// Shared browser-test setup: the fixed clock, the fake CloudKit, a request log and the CSP watch.
import { type BrowserContext, expect, type Page, type Request, test as base } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type Fixtures from '../fixtures/scenarios.json';

const fixtures = JSON.parse(readFileSync(new URL('../fixtures/scenarios.json', import.meta.url), 'utf8')) as typeof Fixtures;

export type ScenarioName = keyof typeof fixtures.scenarios;
export const NOW = fixtures.now;
export const scenarios = fixtures.scenarios;
const CLOUDKIT = 'https://api.apple-cloudkit.com';

/** Runs before the page's own code: records CSP violations, and fails a test that sees one. */
const CSP_WATCH =
  "document.addEventListener('securitypolicyviolation', " +
  "e => window.__cspReport(e.violatedDirective + ' ' + e.blockedURI + ' ' + location.pathname), true);";

export interface Logged {
  url: string;
  method: string;
  body: string | null;
  /** Every header the browser sent, Cookie and Referer included. */
  headers: Promise<Record<string, string>>;
}

/** Answers CloudKit from the fixtures and aborts any other request that leaves the preview. */
export async function fakeNetwork(context: BrowserContext, baseURL: string, log: Logged[]): Promise<void> {
  const origin = new URL(baseURL).origin;
  context.on('request', (r: Request) => {
    const headers = r.allHeaders();
    headers.catch(() => undefined);
    log.push({ url: r.url(), method: r.method(), body: r.postData(), headers });
  });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin || url.protocol === 'blob:' || url.protocol === 'data:') return route.continue();
    if (url.origin !== CLOUDKIT) return route.abort('blockedbyclient');
    // No Set-Cookie here: Firefox's and WebKit's interception stores a fulfilled cookie whatever the
    // request's credentials mode, so the privacy test instead seeds cookies and checks none is sent.
    const cors = { 'Access-Control-Allow-Origin': origin };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const names = (JSON.parse(route.request().postData() ?? '{}') as { records?: { recordName: string }[] }).records?.map((r) => r.recordName) ?? [];
    const scenario = Object.values(scenarios).find((s) => s.id === names[0]);
    if (!scenario) return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ records: names.map((recordName) => ({ recordName, serverErrorCode: 'NOT_FOUND' })) }) });
    const body = typeof scenario.body === 'string' ? scenario.body : JSON.stringify(scenario.body);
    return route.fulfill({ status: scenario.status, headers: cors, contentType: 'application/json', body });
  });
}

export const test = base.extend<{ log: Logged[]; csp: string[] }>({
  // Every CSP violation on every document a test opens, reported out of the page as it happens.
  csp: async ({ context }, use) => {
    const csp: string[] = [];
    await context.exposeBinding('__cspReport', (_source, v: string) => void csp.push(v));
    await context.addInitScript(CSP_WATCH);
    await use(csp);
    expect(csp, 'CSP violations').toEqual([]);
  },
  log: async ({ context, baseURL, csp }, use) => {
    void csp;
    const log: Logged[] = [];
    await fakeNetwork(context, baseURL as string, log);
    await use(log);
  },
  page: async ({ page, log }, use) => {
    void log;
    await page.clock.setFixedTime(new Date(NOW));
    await use(page);
  },
});

export { expect };

/** The page for a scenario, with an optional fragment by name, once the script has settled. */
export async function open(page: Page, name: ScenarioName | string, fragment?: string): Promise<void> {
  const s = (scenarios as Record<string, (typeof scenarios)[ScenarioName]>)[name];
  const id = s ? s.id : name;
  const hash = fragment && s ? `#${(s.fragments as Record<string, string>)[fragment] ?? fragment}` : '';
  // A new document every time: a hash-only change wouldn't reload the page.
  await page.goto('about:blank');
  await page.goto(`/p/${id}${hash}`);
  await settled(page);
}

/** Waits until the script has decided: a state other than the static one, or a lookup outcome. */
export async function settled(page: Page): Promise<void> {
  await page.waitForFunction(() => document.body.dataset.lookup !== undefined || document.body.dataset.state !== 'bare' || !document.querySelector('script'));
}

export const mainText = async (page: Page): Promise<string> => (await page.textContent('main')) ?? '';
export const state = async (page: Page): Promise<string> => (await page.getAttribute('body', 'data-state')) ?? '';
