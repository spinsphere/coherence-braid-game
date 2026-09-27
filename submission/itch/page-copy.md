# itch.io project page: every field, ready to paste

Source of truth for the copy is `ITCH.md`, `CREDITS.md` and `src/content/about.ts`. This file
turns them into the exact values for each field of the "Create a new project" form.

## Basics

| Field | Value |
|---|---|
| Title | `COHERENCE: Braid` |
| Project URL | `https://wanderingconsciousness.itch.io/coherence-braid` (slug `coherence-braid`) |
| Short description / tagline (max 120 chars) | `You do not build a civilization. You ask it questions, and you braid it. Quantum braiding, exactly simulated.` |
| Classification | Games |
| Kind of project | **HTML** (played in the browser) |
| Release status | Released |
| Pricing | No payments |

## Uploads

- `submission/assets/coherence-braid-itch.zip` (built from `npm run build:itch`; `index.html` at the root; 42 files, ~380 KB).
- Tick **"This file will be played in the browser"**.
- Embed options: **Embed in page**, viewport **1280 × 800**, tick **Fullscreen button**, tick **Mobile friendly**, orientation **Landscape** (the game is responsive; itch switches phones to click-to-fullscreen anyway).
- Do not tick "SharedArrayBuffer support"; the game does not use it.

## Details

**Genre:** Puzzle

**Tags (10 max, do not repeat genre or platform):**
`quantum`, `physics`, `braid`, `topology`, `singleplayer`, `short`, `educational`, `procedural-generation`, `minimalist`, `experimental`

**AI generation disclosure:** Yes, with the mandatory sub-classification ticked as **Code** and **Text & Dialog** (not Graphics, not Sounds; all art is procedural SVG written as code). See "Decisions for you" in `submission/README.md`. The repository's git
history carries `Co-Authored-By: Claude` lines, so the honest answer is **Yes** (code and copy were written
with an AI coding assistant; the physics, design and all art are procedural, not generated images).

**Custom noun:** leave blank.

**Community:** Comments.

**Visibility:** Draft first, save, review, then Public. The jam submission is a separate step on the jam page
(`https://itch.io/jam/quantum-game-jam-2026` → "Submit your project"), which also asks for the game
and shows any jam-specific questions.

**Cover image:** `submission/assets/cover-630x500.png` (630 × 500, itch's recommended size).

**Gameplay video:** the YouTube URL of `submission/assets/coherence-braid-trailer.mp4` once uploaded
(title and description for YouTube are in `submission/video/youtube.md`).

**Screenshots (upload 3 to 5):**
1. `submission/assets/screenshot-1.png` · Level 5, The Unasked: the interference readout
2. `submission/assets/screenshot-2.png` · Level 8, The Federation: the Bell test with Moth's witness
3. `submission/assets/screenshot-3.png` · Level 9, Deep Time: contact
4. `submission/assets/live-order-effect.png` · Level 1: the order you did not choose (from the video run)
5. `submission/assets/live-stuck.png` · the Stuck? solver (from the video run)

## Description (paste into the rich-text editor; headings are itch "Heading" style, the rest is paragraphs)

---

**You do not build a civilization. You ask it questions, and you braid it.**

Your people are cohorts, drawn as pairs of worldlines running upward through time. Braiding two worldlines (crossing one over the other) changes what the people are without anyone deciding anything: it is protected, reversible, and, because the braid group is non-commutative, the order of crossings matters. Asking a question forces a cohort to take a definite stance: it creates a fact that did not exist before, and it costs coherence. Some questions cannot both be answered sharply. The questions you never ask keep interfering.

Your only master statistic is coherence, whether your society is still one thing. Lose it and the civilization collapses; only its myths survive into the next level. Late in the game, two civilizations can prove their alliance is real with a Bell test that no amount of prior coordination can fake. That is the Federation.

Nine levels, about twenty minutes. Plays in the browser on a phone or a desktop. A short tutorial opens the game; every level has Help, a Map of the whole journey, and a Stuck? button that explains the next move and will make it for you if you like. Judges and the impatient can open every level from the Levels screen.

### How it relates to quantum physics

Every cohort is a qubit and the civilization is a density matrix, simulated exactly. Asking a question is a projective measurement in the Z or X basis; the two questions of each pair are incompatible observables, so a sharp answer to one widens the other, and asking in a different order gives different statistics (level 1 shows you the order you did not choose). Coherence is the purity Tr(ρ²). Deprivation is a dephasing channel. The Federation level runs a CHSH Bell test, exact and sampled, and shows Moth Quantum's own CHSH witness beside it. The Born rule is the only randomness in the game; the first outcome of each session comes from a qubit measured on Moth Quantum's coin-toss engine, and every later one is labelled honestly as classical.

### How it relates to the theme, quantum braiding

The braid is the game's verb. Crossings are the generators of the braid group in its Ising-anyon (Majorana) representation: an internal crossing is exp(−iπ/4·Z), an exchange is exp(−iπ/4·XX), an under-crossing is the inverse. They satisfy the braid relations, they never lower coherence (topological protection as a rule), and they do not commute, which is why level 3 asks you to find the right order and level 8 punishes doing the ritual after the exchange. The diagram on screen is the actual braid word of your civilization, and you can eject it as an OpenQASM 3 circuit.

### The levels

1. **The River** · order effects
2. **The Crossing** · braiding makes facts travel
3. **Order** · the braid group does not commute
4. **Ownership and Obligation** · incompatible questions
5. **The Unasked** · interference
6. **Care** · deprivation is decoherence
7. **Suppression** · hidden decoherence
8. **The Federation** · a Bell test
9. **Deep Time** · sandbox, eras and myths

### Credits

Design & development by **soliax** (Wandering Consciousness) · https://x.com/WanderingIshiki · source: https://github.com/spinsphere/coherence-braid-game

**Moth Quantum** (https://mothquantum.com): coin-toss-v1, comet-qrng-v1 and labyrinth-v1, run on the platform emulator on 2026-09-26; job ids are in the game's certificate panel and in `public/moth/provenance.json`.

Ideas: Busemeyer and Bruza, *Quantum Models of Cognition and Decision*; Trnka and Lorencová, *Quantum Anthropology* (used as analogy); the Ising-anyon braid representation from topological quantum computing (Kitaev; Nayak et al., Rev. Mod. Phys. 80, 1083). Everything on screen is procedural SVG and CSS; no engine, no fonts fetched, no likenesses. Built with Next.js, React, Tailwind, Vitest and Playwright (screenshots only).

Made for the Global Quantum Game Jam 2026, theme: quantum BRAIDing.

---
