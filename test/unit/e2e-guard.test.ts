// Every browser test goes through test/e2e/support.ts, whose fake network answers CloudKit from the
// Runs from the repository root (npm test).
// fixtures and aborts everything else: no spec may take Playwright's bare `test`.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

test('browser specs import test only from ./support', () => {
  const dir = new URL('test/e2e/', `file://${process.cwd()}/`);
  const specs = readdirSync(dir).filter((f) => f.endsWith('.spec.ts'));
  assert.ok(specs.length > 0);
  for (const f of specs) {
    const text = readFileSync(new URL(f, dir), 'utf8');
    assert.ok(!text.includes("from '@playwright/test'"), `${f} imports @playwright/test directly`);
    assert.ok(text.includes("from './support'"), `${f} doesn't use ./support`);
    assert.ok(!/\btest\.(skip|fixme|only)\b|\bdescribe\.(skip|only)\b/.test(text), `${f} skips or narrows tests`);
  }
});
