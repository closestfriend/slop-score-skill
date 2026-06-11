#!/usr/bin/env node
// Regenerate data/normalization.json from a leaderboard_results.json.
// Mirrors slop-score.html loadLeaderboard(): computeRange with 10% buffer.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'data', 'normalization.json');

const srcPath = process.argv[2];
if (!srcPath) {
  console.error('Usage: node scripts/build-normalization.mjs <path/to/leaderboard_results.json>');
  console.error('Get leaderboard data from https://eqbench.com (slop-score leaderboard).');
  process.exit(2);
}
const json = JSON.parse(readFileSync(srcPath, 'utf8'));
const rows = json.results || json;

const computeRange = (values) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  return { min: min - range * 0.1, max: max + range * 0.1 };
};

const norm = {
  slop_words: computeRange(rows.map(r => r.metrics.slop_list_matches_per_1k_words || 0)),
  slop_trigrams: computeRange(rows.map(r => r.metrics.slop_trigram_matches_per_1k_words || 0)),
  contrast: computeRange(rows.map(r => r.metrics.not_x_but_y_per_1k_chars || 0)),
};

writeFileSync(outPath, JSON.stringify(norm, null, 2) + '\n');
console.error(`Wrote ${outPath} from ${srcPath}`);
