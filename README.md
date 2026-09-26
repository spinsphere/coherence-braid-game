# COHERENCE: Braid

A browser game for the **Global Quantum Game Jam 2026** (theme: quantum braiding).
You do not build a civilization. You ask it questions, and you braid it.

Design & Development by **soliax** (Wandering Consciousness) ·
[x.com/WanderingIshiki](https://x.com/WanderingIshiki) ·
[github.com/spinsphere/coherence-braid-game](https://github.com/spinsphere/coherence-braid-game)

Cohorts are qubits drawn as pairs of worldlines. Braiding is the Ising-anyon
(Majorana) representation of the braid group, computed exactly on a density
matrix. Asking is a projective measurement, the only place randomness enters,
and the randomness comes first from Moth Quantum's engines, then from the
browser, with every draw labelled on screen.

- Stack: Next.js 15 (App Router), TypeScript, Tailwind. No game engine, no
  external fonts, no runtime network access. All art is procedural SVG.
- Onboarding: a five-page tutorial before the first level (again from
  "How to play"), a **Help** panel per level, a **Stuck?** button that
  explains the next move and can play it for you (`src/game/hints.ts`),
  and a **Map** overlay of the whole journey with the current stage marked.
- Simulator: `src/sim/` (hand-written, dependency-free, tested).
- Game rules and levels: `src/game/`, `src/levels/`.
- Baked Moth results: `public/moth/` (see `scripts/moth-api-notes.md`).

## Run

```sh
npm install
npm test          # vitest: braid relations, Born statistics, CHSH, QASM, levels,
                  # and a full playthrough of every level by the Stuck? solver
npm run dev       # http://localhost:3000
```

## Bake Moth assets

The game ships with results already baked. To re-bake (or bake for the first
time), put the key in `.env.local` (`MOTH_API_KEY=...`, never committed) and run:

```sh
npm run bake:moth               # all three engines, in priority order
node scripts/moth-bake.mjs cointoss   # or one at a time: cointoss | entropy | labyrinth
node scripts/moth-bake.mjs --dry-run  # show what would be submitted
```

Credit cost per run (from the live catalog on 2026-09-26):

| engine | credits | used for |
|---|---|---|
| `coin-toss-v1` | 2 | one Born-rule sample (the engine returns counts, not bits) |
| `comet-qrng-v1` | 5 | the entropy certificate and CHSH witness, plus any extractable bytes |
| `labyrinth-v1` | 5 | the Deep Time sandbox graph (cohort order, deprivation, one wall) |

`public/moth/provenance.json` records job ids; re-running downloads completed
jobs instead of paying again. Without a key the script writes placeholder
files and the game says on screen that it is running on classical randomness.

## Build for itch.io (static)

```sh
npm run build:itch     # STATIC_EXPORT=1 next build, then zips out/ -> coherence-braid-itch.zip
```

Upload `coherence-braid-itch.zip` as an HTML5 game with `index.html` as the
entry point. The export uses relative asset paths, so it works from itch's
nested URL. The `/api/moth/seed` route is excluded from this build; the game
needs no network at all.

## Deploy to Vercel

Import the repository with `coherence-braid` as the root directory. Set the
environment variables:

- `MOTH_API_KEY` (server only): enables the optional `/api/moth/seed` route,
  which submits a fresh `comet-qrng-v1` job and returns the same shape as
  `entropy.json`. Rate limited to one call per minute and three per process.
- `NEXT_PUBLIC_MOTH_PROXY_URL`: the deployed origin. When set, the game shows
  a "Fetch a fresh certified seed" button; in the static build it is hidden.

`npm run build` (without `STATIC_EXPORT`) is the Vercel build.

## Press kit

```sh
npm run build && npm run press   # press/cover-630x500.png and press/screenshot-{1,2,3}.png
```

The script starts the built app, screenshots the `/press` route with
Playwright and stops. If Chromium cannot be launched, open `/press` in a
browser and screenshot the frames by hand.

## Jam submission checklist

- [ ] Cover image 630×500 (`press/cover-630x500.png`)
- [ ] Three screenshots (`press/screenshot-*.png`)
- [ ] 2–3 minute video: title, level 1 (order effect modal), level 2 (a fact
      travelling along the braid), level 8 (Bell test modal with the Moth witness)
- [ ] "How it relates to quantum physics": see `ITCH.md`
- [ ] "How it relates to the theme": see `ITCH.md`
- [ ] Upload `coherence-braid-itch.zip`, tick "This file will be played in the browser"
- [ ] Credits: see `CREDITS.md`

## Physics notes (short)

- σ₂ⱼ₋₁ = exp(−iπ/4·Zⱼ), σ₂ⱼ = exp(−iπ/4·XⱼXⱼ₊₁). Yang–Baxter, far
  commutation and non-commutation are tested.
- Coherence = Tr(ρ²). Deprivation d dephases with probability d/4 per season.
- Braiding conserves parity, so no cohort becomes certain of an X answer by
  braiding alone from the founding state. Levels 2, 3 and 5 turn on this.
- CHSH settings are X, Y and (X±Y)/√2 because braided correlations live in the
  X–Y plane; the Z/X textbook settings read zero for every reachable state.
