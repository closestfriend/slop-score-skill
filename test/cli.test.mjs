import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cli = join(__dirname, '..', 'scripts', 'slop-score.mjs');

test('--json on a slop-heavy file returns valid JSON with all sections', () => {
  const tmp = join(__dirname, '_tmp_heavy.txt');
  writeFileSync(tmp, "She absently ached, abuzz and acrid. It was not a warning, but a promise.");
  try {
    const out = execFileSync('node', [cli, '--file', tmp, '--json'], { encoding: 'utf8' });
    const j = JSON.parse(out);
    assert.equal(typeof j.slop_score, 'number');
    assert.ok(['SLOP', 'clean'].includes(j.verdict));
    assert.equal(typeof j.stage2_enabled, 'boolean');
    assert.ok(Array.isArray(j.top_words));
    assert.ok(Array.isArray(j.contrast_matches));
    assert.ok(j.components.words && j.components.contrast && j.components.trigrams);
  } finally { rmSync(tmp); }
});

test('missing file exits nonzero with a clear message', () => {
  assert.throws(() => execFileSync('node', [cli, '--file', '/no/such/file.txt', '--json'],
    { encoding: 'utf8', stdio: 'pipe' }));
});

test('--text path works and human output contains the headline', () => {
  const out = execFileSync('node', [cli, '--text', 'A perfectly ordinary sentence.'], { encoding: 'utf8' });
  assert.match(out, /Slop Score/i);
});
