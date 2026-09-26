import type { Level } from "@/game/types";
import { DEFAULT_COHORT_NAMES } from "@/content/cohorts";
import labyrinth from "../../public/moth/labyrinth.json";

interface LabyrinthFile {
  source?: string;
  jobId?: string;
  raw?: {
    num_qubits?: number;
    results?: { z_expectations?: number[]; zz_couplings?: { qubits: number[]; value: number }[] };
    target?: { edge_signs?: { qubits: number[]; sign: number }[] };
  };
}

export interface SandboxSeed {
  fromMoth: boolean;
  jobId: string | null;
  cohortNames: string[];
  deprivation: number[];
  allowedCrossings: number[];
  walls: number[]; // external crossing indices removed by ZZ walls
  zExpectations: number[];
}

/**
 * Seed the Deep Time sandbox from the baked labyrinth graph: rooms become
 * cohorts (ordered by their measured <Z>), |<Z>| sets deprivation, and an
 * external crossing exists only where the engine measured a corridor
 * (ZZ sign +1). Falls back to a hand-written default.
 */
export function sandboxSeed(): SandboxSeed {
  const lab = labyrinth as LabyrinthFile;
  const n = 5;
  const allInternal = [1, 3, 5, 7, 9];
  const allExternal = [2, 4, 6, 8];
  const z = lab.raw?.results?.z_expectations;
  const signs = lab.raw?.target?.edge_signs;
  if (lab.source !== "moth" || !z || z.length !== n || !signs) {
    return {
      fromMoth: false,
      jobId: null,
      cohortNames: DEFAULT_COHORT_NAMES.slice(0, n),
      deprivation: [0.05, 0.1, 0.15, 0.1, 0.05],
      allowedCrossings: [...allInternal, ...allExternal].sort((a, b) => a - b),
      walls: [],
      zExpectations: [],
    };
  }
  const order = z.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const cohortNames = order.map((_, rank) => DEFAULT_COHORT_NAMES[rank]);
  // rooms keep their positions; the name is given by rank of <Z>
  const names = new Array<string>(n);
  order.forEach((o, rank) => (names[o.i] = cohortNames[rank]));
  const deprivation = z.map((v) => Number((0.25 * (0.5 - Math.min(0.5, Math.abs(v)))).toFixed(2)));
  const walls: number[] = [];
  for (const e of signs) {
    const [a, b] = e.qubits;
    if (e.sign < 0 && b === a + 1) walls.push(2 * (a + 1));
  }
  const allowedCrossings = [...allInternal, ...allExternal.filter((k) => !walls.includes(k))].sort((a, b) => a - b);
  return { fromMoth: true, jobId: lab.jobId ?? null, cohortNames: names, deprivation, allowedCrossings, walls, zExpectations: z };
}

export function applySandboxSeed(level: Level): Level {
  if (!level.sandbox) return level;
  const seed = sandboxSeed();
  return { ...level, cohortNames: seed.cohortNames, deprivation: seed.deprivation, allowedCrossings: seed.allowedCrossings };
}
