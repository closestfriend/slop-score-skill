import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreText } from '../scripts/lib/contrast-detector.mjs';
import { hasPosTagger } from '../scripts/lib/pos-tagger.mjs';

test('Stage 1 detects a "not X, but Y" contrast without the POS tagger', () => {
  const r = scoreText("It was not a warning, but a promise of what was to come.");
  assert.ok(r.hits >= 1, 'expected at least one contrast hit');
  assert.ok(r.rate_per_1k > 0);
  assert.equal(typeof r.matches[0].sentence, 'string');
});

test('clean prose yields zero contrast hits', () => {
  const r = scoreText("The committee approved the budget after a short discussion.");
  assert.equal(r.hits, 0);
});

test('hasPosTagger() is a boolean and does not throw when wink is absent', () => {
  assert.equal(typeof hasPosTagger(), 'boolean');
});
