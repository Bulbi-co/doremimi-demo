// Guard for the fake status bar's clock (app/lib/clock.js): it is the device's, so it reads the same whatever the
// app's language is. It imports the function the phone runs and reads app.js for the one place that draws the clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deviceClock } from '../app/lib/clock.js';

test('the status bar reads 24-hour HH:MM, zero-padded, with no AM/PM in any language', () => {
  assert.equal(deviceClock(new Date(2026, 10, 16, 20, 48)), '20:48');
  assert.equal(deviceClock(new Date(2026, 10, 16, 9, 5)), '09:05');
  assert.equal(deviceClock(new Date(2026, 10, 16, 0, 0)), '00:00');
  assert.equal(deviceClock(new Date(2026, 10, 16, 12, 30)), '12:30');
});

test('app.js draws the clock with that function and never formats a time in the app’s language', () => {
  const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
  const draws = app.match(/\$\('#clock'\)\.textContent = ([^;]+);/g) ?? [];
  assert.deepEqual(draws, ["$('#clock').textContent = deviceClock(new Date());"]);
  assert.doesNotMatch(app, /toLocaleTimeString/);
});
