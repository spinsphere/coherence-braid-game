import { chshOf, probabilities, overlap } from "@/sim";
import type { GameState } from "@/game/types";
import { questionFor } from "@/game/questions";

export interface GoalVerdict {
  status: "won" | "failed" | null;
  progress: string;
  reason?: string;
}

type GoalFn = (state: GameState, params: Record<string, unknown>) => GoalVerdict;

const nonOpeningBraids = (state: GameState) => state.worldLine.filter((e) => e.type === "braid" && !e.opening);

export const GOALS: Record<string, GoalFn> = {
  none: () => ({ status: null, progress: "" }),

  ask_both_same_cohort: (state) => {
    const done = state.cohorts.find((c) => c.askedZ > 0 && c.askedX > 0);
    if (done) return { status: "won", progress: `${done.name} answered both questions.` };
    const parts = state.cohorts.map((c) => `${c.name}: ${c.askedZ ? "Z" : "·"}${c.askedX ? "X" : "·"}`);
    return { status: null, progress: `Asked so far: ${parts.join(", ")}` };
  },

  x_certainty: (state, p) => {
    const cohort = Number(p.cohort);
    const outcome = Number(p.outcome) as 0 | 1;
    const minP = Number(p.minP);
    const c = state.cohorts[cohort];
    const q = questionFor(state.level.questionPair, "X");
    if (c.askedX > 0) {
      return {
        status: "failed",
        progress: "",
        reason: `You asked the ${c.name} before they were certain. The answer was a coin, not a certainty. Try again.`,
      };
    }
    const pr = probabilities(state.rho, cohort, "X");
    const val = outcome === 0 ? pr.p0 : pr.p1;
    if (val >= minP) return { status: "won", progress: `p(${q.stances[outcome]}) = ${val.toFixed(2)}` };
    return { status: null, progress: `p(${q.stances[outcome]}) for the ${c.name}: ${val.toFixed(2)} (need ${minP})` };
  },

  fidelity: (state, p) => fidelityGoal(state, p, false),
  fidelity_no_ask: (state, p) => fidelityGoal(state, p, true),

  obligation_owed: (state, p) => {
    const minZ = Number(p.minZ ?? 2);
    const zAsks = state.worldLine.filter((e) => e.type === "ask" && e.basis === "Z").length;
    const q = questionFor(state.level.questionPair, "X");
    const owed = state.cohorts.filter((c) => c.lastStance && c.lastStance.basis === "X" && c.lastStance.stance === q.stances[0]);
    const okOwed = owed.length === state.cohorts.length;
    if (okOwed && zAsks >= minZ) return { status: "won", progress: "" };
    return {
      status: null,
      progress: `${q.stances[0]}: ${owed.length}/${state.cohorts.length} cohorts. Register entries: ${zAsks}/${minZ}.`,
    };
  },

  survive_asked_x: (state) => {
    const asked = state.cohorts.filter((c) => c.askedX > 0).length;
    const n = state.cohorts.length;
    if (state.season >= state.level.maxSeasons) {
      if (asked === n) return { status: "won", progress: "" };
      return { status: "failed", progress: "", reason: `The seasons ran out with ${n - asked} cohort${n - asked === 1 ? "" : "s"} never asked.` };
    }
    return { status: null, progress: `Asked the need question: ${asked}/${n}. Season ${state.season}/${state.level.maxSeasons}.` };
  },

  survive: (state) => {
    if (state.season >= state.level.maxSeasons) return { status: "won", progress: "" };
    return { status: null, progress: `Season ${state.season}/${state.level.maxSeasons}.` };
  },

  bell: (state, p) => {
    const minS = Number(p.minS ?? 2.2);
    const last = [...state.worldLine].reverse().find((e) => e.type === "bell");
    const cut = state.level.bell;
    const live = cut ? chshOf(state.rho, cut.a, cut.b).S : 0;
    if (last && last.type === "bell" && last.S > minS) return { status: "won", progress: `S = ${last.S.toFixed(3)}` };
    return { status: null, progress: `Live S = ${live.toFixed(2)} (need > ${minS}). Run the Bell test when ready.` };
  },
};

function fidelityGoal(state: GameState, p: Record<string, unknown>, failOnAsk: boolean): GoalVerdict {
  const minF = Number(p.minF ?? 0.99);
  if (failOnAsk && state.worldLine.some((e) => e.type === "ask")) {
    return { status: "failed", progress: "", reason: "The question you asked created a fact, and the fact broke the peace." };
  }
  if (!state.target) return { status: null, progress: "" };
  const f = overlap(state.rho, state.target);
  if (f >= minF) return { status: "won", progress: `Fidelity ${f.toFixed(3)}` };
  const used = nonOpeningBraids(state).length;
  return { status: null, progress: `Fidelity to the target: ${f.toFixed(2)} after ${used} crossing${used === 1 ? "" : "s"}.` };
}

export function evaluateGoal(state: GameState): GoalVerdict {
  const fn = GOALS[state.level.goal.id];
  if (!fn) return { status: null, progress: "" };
  return fn(state, state.level.goal.params ?? {});
}
