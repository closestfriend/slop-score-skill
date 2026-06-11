#!/usr/bin/env node
// slop-score.mjs - eqbench Slop Score CLI (Sam Paech heuristic), standalone port.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { wordsOnlyLower, alphaTokens } from './lib/utils.mjs';
import { loadSlopSets, computeSlopIndex } from './lib/slop-index.mjs';
import { scoreText } from './lib/contrast-detector.mjs';
import { initPosTagger, hasPosTagger } from './lib/pos-tagger.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const normPath = join(__dirname, '..', 'data', 'normalization.json');

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function normalizeValue(v, range) { return clamp01((v - range.min) / (range.max - range.min)); }

// Exported for tests: applies leaderboard normalization + 60/25/15 weighting.
export function computeComposite({ wordScore, trigramScore, contrastRate }, norm) {
  const normWords = normalizeValue(wordScore, norm.slop_words);
  const normTrigrams = normalizeValue(trigramScore, norm.slop_trigrams);
  const normContrast = normalizeValue(contrastRate, norm.contrast);
  const slop_score = (normWords * 0.6 + normContrast * 0.25 + normTrigrams * 0.15) * 100;
  return {
    slop_score,
    verdict: slop_score > 25 ? 'SLOP' : 'clean',
    components: {
      words: { raw: wordScore, normalized: normWords, weight: 0.6 },
      contrast: { raw: contrastRate, normalized: normContrast, weight: 0.25 },
      trigrams: { raw: trigramScore, normalized: normTrigrams, weight: 0.15 },
    },
  };
}

function parseArgs(argv) {
  const a = { mode: null, value: null, json: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--json') a.json = true;
    else if (t === '--file') { a.mode = 'file'; a.value = argv[++i]; }
    else if (t === '--text') { a.mode = 'text'; a.value = argv[++i]; }
    else if (t === '--stdin') { a.mode = 'stdin'; }
    else if (!a.mode) { a.mode = 'file'; a.value = t; } // bare arg = path
  }
  return a;
}

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

async function main() {
  const args = parseArgs(process.argv);
  let raw = '';
  try {
    if (args.mode === 'file') raw = readFileSync(args.value, 'utf8');
    else if (args.mode === 'text') raw = args.value || '';
    else if (args.mode === 'stdin') raw = readStdin();
    else { process.stderr.write('Usage: slop-score (--file <path> | --text "..." | --stdin) [--json]\n'); process.exit(2); }
  } catch (e) {
    process.stderr.write(`Error reading input: ${e.message}\n`); process.exit(1);
  }
  if (!raw || !raw.trim()) { process.stderr.write('Error: empty input.\n'); process.exit(1); }

  loadSlopSets();
  await initPosTagger(); // enables Stage 2 if wink-pos-tagger is installed
  const stage2 = hasPosTagger();

  const toks = alphaTokens(wordsOnlyLower(raw));
  const slop = computeSlopIndex(toks, true);
  const contrast = scoreText(raw);
  const norm = JSON.parse(readFileSync(normPath, 'utf8'));

  const composite = computeComposite(
    { wordScore: slop.wordScore, trigramScore: slop.trigramScore, contrastRate: contrast.rate_per_1k },
    norm
  );

  // Flag list: rank by each item's contribution to the score (count-based, no rewrites).
  const top_words = slop.wordHits.slice(0, 25);
  const top_trigrams = slop.trigramHits.slice(0, 25);
  const contrast_matches = contrast.matches.map(m => ({ sentence: m.sentence, pattern: m.pattern_name }));

  const sentences = raw.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = raw.split(/\s+/).filter(Boolean);
  const unique = new Set(toks);

  const result = {
    slop_score: Number(composite.slop_score.toFixed(2)),
    verdict: composite.verdict,
    stage2_enabled: stage2,
    components: composite.components,
    hits: { word_count: slop.wordHits.reduce((s, [, n]) => s + n, 0),
            trigram_count: slop.trigramHits.reduce((s, [, n]) => s + n, 0),
            contrast_count: contrast.hits },
    top_words, top_trigrams, contrast_matches,
    stats: { tokens: toks.length, chars: raw.length, words: words.length,
             sentences: sentences.length, unique_tokens: unique.size,
             lexical_diversity: toks.length ? Number((unique.size / toks.length * 100).toFixed(1)) : 0 },
  };

  if (args.json) { process.stdout.write(JSON.stringify(result, null, 2) + '\n'); return; }
  printHuman(result);
}

function printHuman(r) {
  const L = [];
  L.push(`=== Slop Score: ${r.slop_score}/100  [${r.verdict}]${r.stage2_enabled ? '' : '  (Stage 2 off)'} ===`);
  L.push(`  Slop words   60%  raw ${r.components.words.raw.toFixed(2)}/1k  -> ${(r.components.words.normalized*100).toFixed(0)}% norm`);
  L.push(`  Not-x-but-y  25%  raw ${r.components.contrast.raw.toFixed(2)}/1k  -> ${(r.components.contrast.normalized*100).toFixed(0)}% norm`);
  L.push(`  Slop trigrams15%  raw ${r.components.trigrams.raw.toFixed(2)}/1k  -> ${(r.components.trigrams.normalized*100).toFixed(0)}% norm`);
  L.push('');
  L.push(`Flagged slop words (${r.hits.word_count} hits): ` +
    (r.top_words.length ? r.top_words.map(([w, n]) => `${w}×${n}`).join(', ') : 'none'));
  L.push(`Flagged slop trigrams (${r.hits.trigram_count} hits): ` +
    (r.top_trigrams.length ? r.top_trigrams.map(([t, n]) => `"${t}"×${n}`).join(', ') : 'none'));
  L.push(`Not-x-but-y sentences (${r.hits.contrast_count}):`);
  if (r.contrast_matches.length) for (const m of r.contrast_matches) L.push(`  - ${m.sentence}`);
  else L.push('  none');
  L.push('');
  L.push(`Stats: ${r.stats.words} words, ${r.stats.sentences} sentences, ${r.stats.lexical_diversity}% lexical diversity`);
  if (!r.stage2_enabled) L.push(`\n(Stage-2 POS contrast patterns disabled. Enable: cd ${join(__dirname, '..')} && npm install)`);
  process.stdout.write(L.join('\n') + '\n');
}

// Only run the CLI when executed directly, not when imported (e.g. by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
