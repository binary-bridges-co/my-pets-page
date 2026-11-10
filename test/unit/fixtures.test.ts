// The committed browser-test fixtures are exactly what test/support/scenarios.ts makes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import committed from '../fixtures/scenarios.json';
import { scenarios } from '../support/scenarios';

test('test/fixtures/scenarios.json is up to date (npm run fixtures)', async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(await scenarios())), committed);
});
