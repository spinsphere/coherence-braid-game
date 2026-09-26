# itch.io page text

## Description

You do not build a civilization. You ask it questions, and you braid it. Your people are cohorts, drawn as pairs of worldlines running upward through time. Braiding two worldlines (crossing one over the other) changes what the people are without anyone deciding anything: it is protected, reversible, and, because the braid group is non-commutative, the order of crossings matters. Asking a question forces a cohort to take a definite stance: it creates a fact that did not exist before, and it costs coherence. Some questions cannot both be answered sharply. The questions you never ask keep interfering. Your only master statistic is coherence, whether your society is still one thing. Lose it and the civilization collapses; only its myths survive into the next level. Late in the game, two civilizations can prove their alliance is real with a Bell test that no amount of prior coordination can fake. That is the Federation.

Nine levels, about twenty minutes. Plays in the browser on a phone or a desktop.

## How it relates to quantum physics

Every cohort is a qubit and the civilization is a density matrix, simulated exactly. Asking a question is a projective measurement in the Z or X basis; the two questions of each pair are incompatible observables, so a sharp answer to one widens the other, and asking in a different order gives different statistics (level 1 shows you the order you did not choose). Coherence is the purity Tr(ρ²). Deprivation is a dephasing channel. The Federation level runs a CHSH Bell test, exact and sampled, and shows Moth Quantum's own CHSH witness beside it. The Born rule is the only randomness in the game; the first outcome of each session comes from a qubit measured on Moth Quantum's coin-toss engine, and every later one is labelled honestly as classical.

## How it relates to the theme

The braid is the game's verb. Crossings are the generators of the braid group in its Ising-anyon (Majorana) representation: an internal crossing is exp(−iπ/4·Z), an exchange is exp(−iπ/4·XX), an under-crossing is the inverse. They satisfy the braid relations, they never lower coherence (topological protection as a rule), and they do not commute, which is why level 3 asks you to find the right order and level 8 punishes doing the ritual after the exchange. The diagram on screen is the actual braid word of your civilization, and you can eject it as an OpenQASM 3 circuit.

## Credits

Moth Quantum (coin-toss-v1, comet-qrng-v1, labyrinth-v1; job ids in the game's certificate panel). Busemeyer and Bruza, *Quantum Models of Cognition and Decision*. Trnka and Lorencová, *Quantum Anthropology*. The Ising-anyon braid representation from topological quantum computing. All art is procedural SVG.
