import type { Basis } from "@/sim";

export interface Question {
  id: string;
  basis: Basis;
  /** short name shown on buttons */
  label: string;
  /** the question as the cohort hears it */
  prompt: string;
  /** stance for outcome 0, stance for outcome 1 */
  stances: [string, string];
}

export interface QuestionPair {
  id: string;
  z: Question;
  x: Question;
  /** one line on why the two cannot both be sharp */
  incompatibility: string;
}

const pair = (id: string, z: Omit<Question, "basis">, x: Omit<Question, "basis">, incompatibility: string): QuestionPair => ({
  id,
  z: { ...z, basis: "Z" },
  x: { ...x, basis: "X" },
  incompatibility,
});

export const QUESTION_PAIRS: Record<string, QuestionPair> = {
  RIVER: pair(
    "RIVER",
    { id: "Q_RIVER", label: "The river", prompt: "What is the river to us?", stances: ["BOUNDARY", "ROAD"] },
    { id: "Q_NEIGHBOUR", label: "The neighbour", prompt: "Who is on the far bank?", stances: ["THREAT", "GUEST"] },
    "A people sure the river is a boundary cannot also be sure the neighbour is a guest. The answers live in different directions.",
  ),
  OWNERSHIP: pair(
    "OWNERSHIP",
    { id: "Q_OWNERSHIP", label: "Ownership", prompt: "Whose is the field?", stances: ["MINE", "OURS"] },
    { id: "Q_OBLIGATION", label: "Obligation", prompt: "What do we owe each other?", stances: ["OWED", "FREE"] },
    "Write sharp ownership into the register and obligation goes indefinite. Settle obligation and the register blurs.",
  ),
  MERIT: pair(
    "MERIT",
    { id: "Q_MERIT", label: "Merit", prompt: "How did they come by what they have?", stances: ["EARNED", "GIVEN"] },
    { id: "Q_NEED", label: "Need", prompt: "Do they have enough?", stances: ["LACKING", "FED"] },
    "A cohort that has been measured by merit has no definite need, and a cohort measured by need has no definite merit.",
  ),
  SECURITY: pair(
    "SECURITY",
    { id: "Q_SECURITY", label: "Security", prompt: "Are we safe?", stances: ["SAFE", "THREATENED"] },
    { id: "Q_TRUST", label: "Trust", prompt: "Can we rely on them?", stances: ["RELY", "DOUBT"] },
    "Ask about safety often enough and trust stops having an answer. Trust, once settled, makes safety a coin.",
  ),
  IDENTITY: pair(
    "IDENTITY",
    { id: "Q_IDENTITY", label: "Identity", prompt: "Are they us?", stances: ["US", "THEM"] },
    { id: "Q_HOSPITALITY", label: "Hospitality", prompt: "May they come in?", stances: ["ENTER", "STAY OUT"] },
    "Identity and hospitality are one question asked from two sides. Sharpen one and the other widens.",
  ),
};

export function questionFor(pairId: string, basis: Basis): Question {
  const p = QUESTION_PAIRS[pairId];
  if (!p) throw new Error(`unknown question pair ${pairId}`);
  return basis === "Z" ? p.z : p.x;
}

export const PAIR_ORDER = ["RIVER", "OWNERSHIP", "MERIT", "SECURITY", "IDENTITY"] as const;
