import type { Basis, Crossing, Rho, RngSource } from "@/sim";

export type ActionKind = "ASK" | "BRAID" | "CARE" | "WAIT" | "BELL";

export type GoalId =
  | "ask_both_same_cohort"
  | "x_certainty"
  | "fidelity"
  | "fidelity_no_ask"
  | "obligation_owed"
  | "survive_asked_x"
  | "survive"
  | "bell"
  | "none";

export interface Level {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  n: number;
  questionPair: string;
  intro: string;
  goalText: string;
  goal: { id: GoalId; params?: Record<string, unknown> };
  openingBraid: string;
  /** cohorts (0-based) that begin already answered in X: the founding fact */
  initialX?: number[];
  deprivation: number[];
  careBudget: number;
  maxSeasons: number;
  coherenceThreshold: number;
  allowedActions: ActionKind[];
  allowedCrossings?: number[];
  contact: boolean;
  cohortNames?: string[];
  hidden?: { cohort: number; untilSeason: number };
  showInterference?: boolean;
  bell?: { a: number; b: number; left: number[]; right: number[]; otherWord: string };
  sandbox?: boolean;
  /** shown once the goal is met */
  winText: string;
}

export interface CohortState {
  index: number;
  name: string;
  color: string;
  deprivation: number;
  lastAskedSeason: number | null;
  lastStance: { questionId: string; basis: Basis; stance: string; season: number } | null;
  askedZ: number;
  askedX: number;
}

export type WorldLineEntry =
  | { type: "braid"; k: number; inverse: boolean; season: number; opening?: boolean; mytheme?: boolean }
  | {
      type: "ask";
      cohort: number;
      basis: Basis;
      questionId: string;
      outcome: 0 | 1;
      stance: string;
      p0: number;
      p1: number;
      rngSource: RngSource;
      rngDetail: string;
      season: number;
    }
  | { type: "care"; cohort: number; season: number }
  | { type: "wait"; season: number }
  | { type: "bell"; season: number; S: number; sampled: number };

export type GameAction =
  | { type: "ask"; cohort: number; basis: Basis }
  | { type: "braid"; k: number; inverse: boolean }
  | { type: "care"; cohort: number }
  | { type: "wait" }
  | { type: "bell" };

export interface OrderComparison {
  cohort: number;
  actual: { questionId: string; stance: string; p: [number, number] }[];
  swapped: { questionId: string; stance: string; p: [number, number] }[];
}

export interface CloudSnapshot {
  label: string;
  word: string;
  cohorts: { name: string; color: string; z: [number, number]; x: [number, number] }[];
}

export interface BellReport {
  S: number;
  E: { ab: number; abPrime: number; aPrimeB: number; aPrimeBPrime: number };
  sampledS: number;
  shots: number;
  sampledSource: RngSource;
  mutualInformation: number;
  won: boolean;
}

export type GameEvent =
  | { type: "won" }
  | { type: "collapsed"; mytheme: Crossing[] }
  | { type: "failed"; reason: string }
  | { type: "contact"; entityId: string; reading: { zCount: number; xCount: number; dominant: "Z" | "X" | "balanced" } }
  | { type: "order"; data: OrderComparison }
  | { type: "clouds"; data: CloudSnapshot[] }
  | { type: "bell"; data: BellReport }
  | { type: "era"; era: string }
  | { type: "revealed"; cohort: number };

export type GameStatus = "playing" | "won" | "collapsed" | "failed";

export interface GameState {
  level: Level;
  rho: Rho;
  target: Rho | null;
  season: number;
  cohorts: CohortState[];
  careLeft: number;
  worldLine: WorldLineEntry[];
  status: GameStatus;
  endReason: string | null;
  contactEntity: string | null;
  events: GameEvent[];
  coherenceHistory: number[];
  mythemes: Crossing[][];
  flags: Record<string, boolean>;
  era: number;
}
