// slop-index.mjs - slop word/trigram scoring (ported verbatim from reference metrics.js)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');

let slopWords = new Set();
let slopTrigrams = new Set();

// Mirrors reference loadSet(): item[0] -> lowercase -> first whitespace-joined alpha phrase
function loadSet(path, outSet) {
  const arr = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(arr)) return;
  for (const item of arr) {
    if (!item || !item.length) continue;
    const phrase = String(item[0]).toLowerCase().match(/[a-z]+(?:'[a-z]+)?(?:\s+[a-z]+(?:'[a-z]+)?)*/g);
    if (phrase) outSet.add(phrase[0]);
  }
}

export function loadSlopSets() {
  if (slopWords.size && slopTrigrams.size) return;
  slopWords = new Set();
  slopTrigrams = new Set();
  loadSet(join(dataDir, 'slop_list.json'), slopWords);
  loadSet(join(dataDir, 'slop_list_trigrams.json'), slopTrigrams);
}

// --- verbatim from reference js/metrics.js computeSlopIndex ---
export function computeSlopIndex(tokens, trackHits = false) {
  const n = tokens.length || 0;
  if (!n) return { wordScore: 0, trigramScore: 0, wordHits: null, trigramHits: null };

  let wordHitCount = 0, triHitCount = 0;
  const wordHitMap = trackHits ? new Map() : null;
  const triHitMap = trackHits ? new Map() : null;

  if (slopWords.size) {
    for (const t of tokens) {
      if (slopWords.has(t)) {
        wordHitCount++;
        if (trackHits) wordHitMap.set(t, (wordHitMap.get(t) || 0) + 1);
      }
    }
  }

  if (slopTrigrams.size && n >= 3) {
    for (let i = 0; i < n - 2; i++) {
      const tg = tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2];
      if (slopTrigrams.has(tg)) {
        triHitCount++;
        if (trackHits) triHitMap.set(tg, (triHitMap.get(tg) || 0) + 1);
      }
    }
  }

  const wordScore = (wordHitCount / n) * 1000;
  const trigramScore = (triHitCount / n) * 1000;
  const result = { wordScore, trigramScore };

  if (trackHits) {
    result.wordHits = Array.from(wordHitMap.entries()).sort((a, b) => b[1] - a[1]);
    result.trigramHits = Array.from(triHitMap.entries()).sort((a, b) => b[1] - a[1]);
  }
  return result;
}
