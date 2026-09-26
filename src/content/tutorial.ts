// The intro tutorial: five short pages shown before the first level and
// available any time from the title screen. Each page names an illustration
// drawn procedurally in components/Tutorial.tsx.

export type TutorialArt = "worldlines" | "ask" | "braid" | "coherence" | "help";

export interface TutorialPage {
  art: TutorialArt;
  title: string;
  body: string[];
}

export const TUTORIAL: TutorialPage[] = [
  {
    art: "worldlines",
    title: "Your people are worldlines",
    body: [
      "Each cohort of your civilization is drawn as a pair of strands running upward through time. Underneath, each cohort is a qubit and the whole civilization is one quantum state.",
      "You never decide what your people believe. You do two things: you ask them questions, and you braid them.",
    ],
  },
  {
    art: "ask",
    title: "Asking creates a fact",
    body: [
      "Every level has a pair of questions. One is the register question (Z), the other the indefinite question (X). The cloud above the braid shows how each cohort leans before you ask.",
      "An answer is drawn by the Born rule from those odds. Once answered, the stance is a fact, and the partner question turns into a coin. That is what incompatible questions do, and why the order you ask in matters.",
    ],
  },
  {
    art: "braid",
    title: "Braiding moves facts without deciding anything",
    body: [
      "A crossing swaps two strands. σ₁, σ₃, σ₅ are rituals within a cohort; σ₂, σ₄ are exchanges between neighbours. An under-crossing is the inverse of an over-crossing.",
      "Braiding is reversible and never lowers coherence. But the braid group does not commute: σ₂ then σ₃ makes a different civilization from σ₃ then σ₂.",
    ],
  },
  {
    art: "coherence",
    title: "Coherence is the only score",
    body: [
      "The dial shows whether your society is still one thing. Asking spends possibility; deprivation erodes it every season; care lowers deprivation. Let it fall below the threshold and the civilization collapses, and only its last three crossings survive as a myth.",
      "Each level has a goal in the panel on the left and a season limit. Reach the goal before the seasons run out.",
    ],
  },
  {
    art: "help",
    title: "You are never stuck",
    body: [
      "Press Stuck? at any moment. It explains where the civilization stands, names the next move and why, and can make the move for you. Play on by hand or press it again.",
      "Help explains the idea behind the current level. Map shows the whole journey, from the river to the Federation, and where you are on it.",
    ],
  },
];
