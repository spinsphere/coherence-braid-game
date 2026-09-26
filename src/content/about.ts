export const PITCH =
  "You do not build a civilization. You ask it questions, and you braid it. Your people are cohorts, drawn as pairs of worldlines running upward through time. Braiding two worldlines (crossing one over the other) changes what the people are without anyone deciding anything: it is protected, reversible, and, because the braid group is non-commutative, the order of crossings matters. Asking a question forces a cohort to take a definite stance: it creates a fact that did not exist before, and it costs coherence. Some questions cannot both be answered sharply. The questions you never ask keep interfering. Your only master statistic is coherence, whether your society is still one thing. Lose it and the civilization collapses; only its myths survive into the next level. Late in the game, two civilizations can prove their alliance is real with a Bell test that no amount of prior coordination can fake. That is the Federation.";

export interface AboutSection {
  title: string;
  body: string[];
}

export const ABOUT: AboutSection[] = [
  {
    title: "The braid is real physics",
    body: [
      "Each cohort is a qubit, drawn as a pair of worldlines. The game uses the Ising-anyon (Majorana) representation of the braid group: an internal crossing σ₂ⱼ₋₁ is exp(−iπ/4·Zⱼ), an exchange σ₂ⱼ is exp(−iπ/4·XⱼXⱼ₊₁), and an under-crossing is the inverse. These are the braiding unitaries of Ising anyons in topological quantum computing, and they satisfy the braid relations: σₖσₖ₊₁σₖ = σₖ₊₁σₖσₖ₊₁ and σₖσₗ = σₗσₖ when the crossings are far apart. The test suite checks both.",
      "Braiding is topologically protected, so in the game it never lowers coherence. Only asking and deprivation do.",
    ],
  },
  {
    title: "Why order matters",
    body: [
      "Adjacent crossings do not commute: σ₂σ₃ and σ₃σ₂ are different unitaries, so a civilization braided one way is a different civilization from one braided the other way. The same is true of questions. Asking about the river and then the neighbour gives different statistics from asking in the other order, because the two questions are incompatible observables (Z and X on the same qubit). Order effects and incompatibility are the two signatures that quantum models of cognition were built to explain.",
    ],
  },
  {
    title: "What coherence is",
    body: [
      "Coherence is the purity of the whole civilization, Tr(ρ²), from 1 (one pure thing) down to 1/2ⁿ (a classical mixture with no interference left). Deprivation is a dephasing channel applied every season: a cohort going without loses the off-diagonal terms that let it interfere. A projective ask leaves a pure state pure, so the ask does not scramble anything by itself. What it costs is possibility: the partner question widens to a coin, and an answered X question is a superposition in exactly the basis the seasons erode. That is the cost you feel on the Care level.",
      "A braided-only civilization also conserves parity. From the founding state, no single cohort can become certain of an X answer by braiding alone. Someone has to ask first; then the fact travels along the braid.",
    ],
  },
  {
    title: "What the Bell test proves",
    body: [
      "The CHSH quantity S combines four correlations between one cohort on each side of the cut. Any explanation in which both sides settled their answers in advance, however cleverly, gives S ≤ 2. An exchange across the cut produces a maximally entangled pair and S = 2√2 ≈ 2.828, the Tsirelson bound. The game computes S analytically from ρ and also samples 200 shots with its RNG so you can see the estimate wobble around the exact value.",
      "One honest detail: braided states carry their correlations in the X–Y plane, so the game's test settings are X and Y on one side and (X±Y)/√2 on the other. A textbook Z/X test would read zero here for every reachable state.",
    ],
  },
  {
    title: "Where the randomness comes from",
    body: [
      "Randomness enters the game in exactly one place: the Born-rule draw when a question is asked. The draws come first from a pool baked from Moth Quantum's engines, then from the browser's cryptographic generator, and every ask shows which. For this build the Comet QRNG job returned a full CHSH witness and an entropy certificate but zero extractable bytes (its extractor is honest about the emulator), and the Coin Toss job returned counts rather than a bit sequence, which yields exactly one uniform sample. So the pool is short. The badge next to each answer never hides that.",
    ],
  },
  {
    title: "What the Moth certificate is",
    body: [
      "The Certificate panel shows, verbatim, the fields Moth's comet-qrng-v1 engine returned: the min-entropy estimate on the raw Born-rule bits, the extractor budget, the CHSH witness measured on four Bell pairs in the same job, the commitment formed before any outcome existed, and the provenance. On the emulator the grade is simulator-baseline and the engine says so. That is the point of showing it.",
    ],
  },
  {
    title: "An honest note",
    body: [
      "The anthropology is analogy. Cohorts, stances, care, contact and mythemes are a way of talking about a state vector, borrowed from a design document called COHERENCE and from Trnka and Lorencová's Quantum Anthropology. The mathematics underneath is not analogy: the braid representation, the density matrix, the incompatibility of Z and X, the interference term, dephasing and the Bell inequality are all computed exactly, and nothing in the game is randomised except the Born rule.",
    ],
  },
];
