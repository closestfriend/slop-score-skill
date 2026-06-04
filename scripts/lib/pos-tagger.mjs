// pos-tagger.js - POS tagging utilities using wink-pos-tagger

let winkPOS = null;
let posReady = false;

export async function initPosTagger() {
  if (posReady) return hasPosTagger();
  try {
    const mod = await import('wink-pos-tagger');
    const factory = mod.default || mod;
    winkPOS = typeof factory === 'function' ? factory() : factory;
    // sanity check
    if (!winkPOS || typeof winkPOS.tagSentence !== 'function') { winkPOS = null; }
    else { winkPOS.tagSentence("The cat sat."); }
  } catch {
    winkPOS = null; // wink-pos-tagger not installed -> Stage 2 disabled
  }
  posReady = true;
  return hasPosTagger();
}

export function hasPosTagger() {
  return !!winkPOS;
}

// Map wink-pos tags to our simplified tags
const VERB_TAGS = new Set(['VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ']);
const NOUN_TAGS = new Set(['NN', 'NNS', 'NNP', 'NNPS']);
const ADJ_TAGS = new Set(['JJ', 'JJR', 'JJS']);
const ADV_TAGS = new Set(['RB', 'RBR', 'RBS']);

export function tagWithPos(text, posType = 'verb') {
  if (!winkPOS) return text;

  const tagged = winkPOS.tagSentence(text);
  const result = [];

  for (const token of tagged) {
    let out = token.value;
    const posTag = token.pos;  // Use 'pos' field, not 'tag'

    if (posTag) {
      if (posType === 'verb' && VERB_TAGS.has(posTag)) {
        out = 'VERB';
      } else if (posType === 'noun' && NOUN_TAGS.has(posTag)) {
        out = 'NOUN';
      } else if (posType === 'adj' && ADJ_TAGS.has(posTag)) {
        out = 'ADJ';
      } else if (posType === 'adv' && ADV_TAGS.has(posTag)) {
        out = 'ADV';
      } else if (posType === 'all') {
        if (VERB_TAGS.has(posTag)) out = 'VERB';
        else if (NOUN_TAGS.has(posTag)) out = 'NOUN';
        else if (ADJ_TAGS.has(posTag)) out = 'ADJ';
        else if (ADV_TAGS.has(posTag)) out = 'ADV';
      }
    }

    result.push(out);
  }

  return result.join(' ');
}

export function tagStreamWithOffsets(text, posType = 'verb') {
  if (!winkPOS) {
    return { stream: text, pieces: [[0, text.length, 0, text.length]] };
  }

  if (typeof winkPOS.tagSentence !== 'function') {
    return { stream: text, pieces: [[0, text.length, 0, text.length]] };
  }

  const tagged = winkPOS.tagSentence(text);

  if (!Array.isArray(tagged)) {
    return { stream: text, pieces: [[0, text.length, 0, text.length]] };
  }

  const parts = [];
  const pieces = [];
  let streamPos = 0;
  let rawPos = 0;

  for (let i = 0; i < tagged.length; i++) {
    const token = tagged[i];
    const posTag = token.pos;  // Use 'pos' field, not 'tag'
    const value = token.value;

    // Find token in original text
    const tokenStart = text.indexOf(value, rawPos);
    if (tokenStart === -1) {
      // Fallback if we can't find it
      rawPos += value.length;
      continue;
    }

    // Map token to POS tag if applicable
    let out = value;
    if (posTag) {
      if (posType === 'verb' && VERB_TAGS.has(posTag)) {
        out = 'VERB';
      } else if (posType === 'noun' && NOUN_TAGS.has(posTag)) {
        out = 'NOUN';
      } else if (posType === 'adj' && ADJ_TAGS.has(posTag)) {
        out = 'ADJ';
      } else if (posType === 'adv' && ADV_TAGS.has(posTag)) {
        out = 'ADV';
      } else if (posType === 'all') {
        if (VERB_TAGS.has(posTag)) out = 'VERB';
        else if (NOUN_TAGS.has(posTag)) out = 'NOUN';
        else if (ADJ_TAGS.has(posTag)) out = 'ADJ';
        else if (ADV_TAGS.has(posTag)) out = 'ADV';
      }
    }

    parts.push(out);
    const outLen = out.length;
    pieces.push([streamPos, streamPos + outLen, tokenStart, tokenStart + value.length]);
    streamPos += outLen;
    rawPos = tokenStart + value.length;

    // Add space between tokens (except last)
    if (i < tagged.length - 1) {
      // Check if there's whitespace in original
      const nextToken = tagged[i + 1];
      const nextPos = text.indexOf(nextToken.value, rawPos);
      if (nextPos > rawPos) {
        const whitespace = text.substring(rawPos, nextPos);
        parts.push(whitespace);
        pieces.push([streamPos, streamPos + whitespace.length, rawPos, nextPos]);
        streamPos += whitespace.length;
        rawPos = nextPos;
      } else {
        // Add single space
        parts.push(' ');
        pieces.push([streamPos, streamPos + 1, rawPos, rawPos]);
        streamPos += 1;
      }
    }
  }

  return {
    stream: parts.join(''),
    pieces: pieces
  };
}
