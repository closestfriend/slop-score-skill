import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordsOnlyLower, alphaTokens } from '../scripts/lib/utils.mjs';
import { loadSlopSets, computeSlopIndex } from '../scripts/lib/slop-index.mjs';

test('wordsOnlyLower + alphaTokens lowercases and keeps alpha tokens', () => {
  const toks = alphaTokens(wordsOnlyLower("The Acrid SMOKE, abuzz! 2024"));
  assert.deepEqual(toks, ['the', 'acrid', 'smoke', 'abuzz']);
});

test('computeSlopIndex counts a real slop word ("absently")', async () => {
  await loadSlopSets();
  const toks = alphaTokens(wordsOnlyLower("She absently stirred her tea absently."));
  const r = computeSlopIndex(toks, true);
  assert.ok(r.wordScore > 0, 'expected positive wordScore');
  const absently = r.wordHits.find(([w]) => w === 'absently');
  assert.equal(absently[1], 2, 'absently should hit twice');
});

test('computeSlopIndex counts a real slop trigram ("voice barely whisper")', async () => {
  await loadSlopSets();
  const toks = alphaTokens(wordsOnlyLower("voice barely whisper"));
  const r = computeSlopIndex(toks, true);
  assert.ok(r.trigramScore > 0, 'expected positive trigramScore');
  assert.equal(r.trigramHits[0][0], 'voice barely whisper');
});

test('clean text scores zero with empty hit lists', async () => {
  await loadSlopSets();
  const toks = alphaTokens(wordsOnlyLower("Quarterly logistics throughput exceeded forecast."));
  const r = computeSlopIndex(toks, true);
  assert.equal(r.wordHits.length, 0);
  assert.equal(r.trigramHits.length, 0);
});
