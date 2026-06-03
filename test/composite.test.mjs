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
