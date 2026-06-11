# slop-score (Claude skill)

A standalone, shareable Claude skill that runs Sam Paech's eqbench **Slop Score**
heuristic against a piece of writing and flags the specific offending phrases.

Faithful port of https://eqbench.com/slop-score.html — composite of slop words
(60%), "not X, but Y" contrast patterns (25%), and slop trigrams (15%),
min-max normalized against the model leaderboard, scaled 0–100. `> 25 = SLOP`.

## Install

```bash
npx skills add closestfriend/slop-score-skill     # Claude Code, Cursor, Codex, etc.
```

Or clone straight into your agent's skills directory:

```bash
git clone https://github.com/closestfriend/slop-score-skill ~/.claude/skills/slop-score
```

Zero-install scoring out of the box — Stage 2 is the only thing that needs `npm install` (see below).

## Usage

```bash
node scripts/slop-score.mjs --file path/to/draft.md        # human readout
node scripts/slop-score.mjs --file path/to/draft.md --json # machine JSON
node scripts/slop-score.mjs --text "some short text"
cat draft.md | node scripts/slop-score.mjs --stdin
```

## Stage 2 (optional, fuller fidelity)

Out of the box it scores slop words + trigrams + Stage-1 surface contrast patterns
with **zero install**. The 35 Stage-2 POS contrast patterns need `wink-pos-tagger`:

```bash
npm install        # local to this folder; unlocks Stage 2
```

The script auto-detects it; if absent, it scores without Stage 2 and says so.
`node_modules/` is gitignored so shared clones stay zero-install.

## Regenerating normalization ranges

If the upstream leaderboard changes:

```bash
node scripts/build-normalization.mjs path/to/leaderboard_results.json
```

## Tests

```bash
node --test
```

## Credit & License

MIT — see [LICENSE](LICENSE). Heuristic and slop lists by Sam Paech
([eqbench.com](https://eqbench.com/slop-score.html) /
[slop-forensics](https://github.com/sam-paech/slop-forensics), MIT).
