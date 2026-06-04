import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

test('normalization.json has the three required ranges with min < max', () => {
  const norm = JSON.parse(readFileSync(join(dataDir, 'normalization.json'), 'utf8'));
  for (const key of ['slop_words', 'slop_trigrams', 'contrast']) {
    assert.ok(norm[key], `missing range ${key}`);
    assert.equal(typeof norm[key].min, 'number');
    assert.equal(typeof norm[key].max, 'number');
    assert.ok(norm[key].max > norm[key].min, `range ${key} must have max > min`);
  }
});

import { computeComposite } from '../scripts/lib/../slop-score.mjs';

test('computeComposite weights 60/25/15 and verdicts at >25', () => {
  const norm = {
    slop_words: { min: 0, max: 100 },
    slop_trigrams: { min: 0, max: 100 },
    contrast: { min: 0, max: 100 },
  };
  // all sub-scores at the max end -> normalized 1.0 each -> 100 composite
  const hi = computeComposite({ wordScore: 100, trigramScore: 100, contrastRate: 100 }, norm);
  assert.equal(Math.round(hi.slop_score), 100);
  assert.equal(hi.verdict, 'SLOP');
  // all zero -> 0 composite -> clean
  const lo = computeComposite({ wordScore: 0, trigramScore: 0, contrastRate: 0 }, norm);
  assert.equal(Math.round(lo.slop_score), 0);
  assert.equal(lo.verdict, 'clean');
});
