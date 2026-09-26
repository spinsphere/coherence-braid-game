# Credits

**COHERENCE: Braid** was built for the Global Quantum Game Jam 2026.

## Design & Development

- **soliax** (Wandering Consciousness)
- Twitter/X: https://x.com/WanderingIshiki
- Source: https://github.com/spinsphere/coherence-braid-game

## Quantum randomness and witnesses

- **Moth Quantum** (https://mothquantum.com), engines run on the platform emulator on 2026-09-26:
  - `coin-toss-v1` v1.0.15, job `5ad6bf88-5167-4099-bd17-e457e059fb0b` (1024 shots: 515 heads, 509 tails)
  - `comet-qrng-v1` v1.0.0, job `6dd52104-4110-4160-a6ea-e7dccc0641e0` (120 000 raw Born-rule bits, CHSH witness S = 2.8186, entropy certificate; zero extractable bytes on the emulator)
  - `labyrinth-v1`, job `df376f7a-5303-4b14-9f0d-b3e3d67cbc07` (1×5 ZZ-correlated graph with one wall)
  - Full records: `public/moth/*.json`, `public/moth/provenance.json`

## Ideas

- Jerome R. Busemeyer and Peter D. Bruza, *Quantum Models of Cognition and Decision* (Cambridge University Press, 2012): order effects, incompatibility and interference in judgement.
- Radek Trnka and Radmila Lorencová, *Quantum Anthropology: Man, Cultures, and Groups in a Quantum Perspective* (Charles University, Karolinum Press, 2016): coherence, inner dynamics and mythemes, used here as analogy.
- The Ising-anyon / Majorana representation of the braid group from topological quantum computing (Kitaev; Nayak, Simon, Stern, Freedman and Das Sarma, *Non-Abelian anyons and topological quantum computation*, Rev. Mod. Phys. 80, 1083 (2008)).
- The larger design document *COHERENCE: a civilization in superposition*, of which this is the jam-sized slice.

## Craft

- Every visual is procedural SVG and CSS written for this game. The entity silhouettes are abstract shapes and depict no person, film or product.
- Next.js, React, Tailwind CSS, Vitest and Playwright (screenshots only).
