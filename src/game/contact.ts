import type { WorldLineEntry } from "./types";

export type EntityId = "greys" | "nordics" | "hairy-dwarfs" | "giants" | "human-passing" | "amphibians" | "exotic";

// Which entity a civilization meets is a function of how it looked.
const BY_PAIR: Record<string, { Z: EntityId; X: EntityId }> = {
  RIVER: { Z: "hairy-dwarfs", X: "amphibians" },
  OWNERSHIP: { Z: "greys", X: "nordics" },
  MERIT: { Z: "greys", X: "nordics" },
  SECURITY: { Z: "giants", X: "amphibians" },
  IDENTITY: { Z: "human-passing", X: "nordics" },
};

export interface ContactReading {
  entity: EntityId;
  zCount: number;
  xCount: number;
  dominant: "Z" | "X" | "balanced";
  pairId: string;
}

export function readContact(worldLine: readonly WorldLineEntry[], pairId: string): ContactReading {
  let zCount = 0;
  let xCount = 0;
  const byPair: Record<string, { Z: number; X: number }> = {};
  for (const e of worldLine) {
    if (e.type !== "ask") continue;
    if (e.basis === "Z") zCount++;
    else xCount++;
    const pid = pairOfQuestion(e.questionId);
    byPair[pid] ??= { Z: 0, X: 0 };
    byPair[pid][e.basis]++;
  }
  const total = zCount + xCount;
  let dominant: ContactReading["dominant"] = "balanced";
  if (total >= 3 && zCount > xCount) dominant = "Z";
  else if (total >= 3 && xCount > zCount) dominant = "X";
  if (dominant === "balanced") return { entity: "exotic", zCount, xCount, dominant, pairId };
  // the pair asked most decides the flavour; ties go to the level's pair
  let best = pairId;
  let bestN = -1;
  for (const [pid, c] of Object.entries(byPair)) {
    const n = c[dominant];
    if (n > bestN) {
      best = pid;
      bestN = n;
    }
  }
  const table = BY_PAIR[best] ?? BY_PAIR[pairId] ?? BY_PAIR.RIVER;
  return { entity: table[dominant], zCount, xCount, dominant, pairId: best };
}

function pairOfQuestion(qid: string): string {
  switch (qid) {
    case "Q_RIVER":
    case "Q_NEIGHBOUR":
      return "RIVER";
    case "Q_OWNERSHIP":
    case "Q_OBLIGATION":
      return "OWNERSHIP";
    case "Q_MERIT":
    case "Q_NEED":
      return "MERIT";
    case "Q_SECURITY":
    case "Q_TRUST":
      return "SECURITY";
    default:
      return "IDENTITY";
  }
}
