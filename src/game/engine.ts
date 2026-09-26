// Pure game reducer. Randomness enters exactly once: the Born-rule draw in an
// ASK (and the sampled shots of a Bell test), always through the BornRng.

import {
  applyUnitary,
  applyWord,
  braid,
  chsh,
  crossingLabel,
  dephase,
  expectationProduct,
  H_GATE,
  identityState,
  isInternal,
  measure,
  measureAxis,
  mutualInformation,
  parseWord,
  probabilities,
  purity,
  reducedDensity,
  type BornRng,
  type Basis,
  type Crossing,
  type Rho,
  type RngSource,
} from "@/sim";
import { evaluateGoal } from "@/levels/goals";
import { applySandboxSeed } from "@/levels/sandbox";
import { COHORT_COLORS, DEFAULT_COHORT_NAMES } from "@/content/cohorts";
import { eraIndex, ERAS } from "@/content/eras";
import { PAIR_ORDER, questionFor } from "./questions";
import { readContact } from "./contact";
import type { BellReport, CloudSnapshot, CohortState, GameAction, GameState, Level, OrderComparison, WorldLineEntry } from "./types";

/** A season erodes a quarter of a cohort's deprivation: p_dephase = deprivation * 0.25. */
export const DEPHASE_PER_SEASON = 0.25;
export const CONTACT_SEASON = 6;
export const CARE_STEP = 0.1;
export const RECENT_ASK_WINDOW = 3;
export const BELL_SHOTS = 200;

export function initialRho(level: Level, mythemes: Crossing[][] = []): { rho: Rho; base: Rho } {
  let rho = identityState(level.n);
  for (const q of level.initialX ?? []) rho = applyUnitary(rho, H_GATE, [q]);
  const base = rho;
  rho = applyWord(rho, parseWord(level.openingBraid));
  for (const m of mythemes) rho = applyWord(rho, m);
  return { rho, base };
}

export function createGame(levelIn: Level, mythemes: Crossing[][] = []): GameState {
  const level = applySandboxSeed(levelIn);
  const { rho, base } = initialRho(level, mythemes);
  const names = level.cohortNames ?? DEFAULT_COHORT_NAMES;
  const cohorts: CohortState[] = [];
  for (let i = 0; i < level.n; i++) {
    cohorts.push({
      index: i,
      name: names[i] ?? `Cohort ${i + 1}`,
      color: COHORT_COLORS[i % COHORT_COLORS.length],
      deprivation: level.deprivation[i] ?? 0,
      lastAskedSeason: null,
      lastStance: null,
      askedZ: 0,
      askedX: 0,
    });
  }
  const worldLine: WorldLineEntry[] = [];
  for (const c of parseWord(level.openingBraid)) worldLine.push({ type: "braid", k: c.k, inverse: c.inverse, season: 0, opening: true });
  for (const m of mythemes) for (const c of m) worldLine.push({ type: "braid", k: c.k, inverse: c.inverse, season: 0, opening: true, mytheme: true });
  const params = level.goal.params ?? {};
  const target = typeof params.targetWord === "string" ? applyWord(base, parseWord(params.targetWord)) : null;
  const state: GameState = {
    level,
    rho,
    target,
    season: 0,
    cohorts,
    careLeft: level.careBudget,
    worldLine,
    status: "playing",
    endReason: null,
    contactEntity: null,
    events: [],
    coherenceHistory: [purity(rho)],
    mythemes,
    flags: {},
    era: 0,
  };
  return state;
}

export function currentPair(state: GameState): string {
  if (state.level.sandbox) return PAIR_ORDER[state.era % PAIR_ORDER.length];
  return state.level.questionPair;
}

export function coherence(state: GameState): number {
  return purity(state.rho);
}

export function cohortPurity(state: GameState, cohort: number): number {
  return purity(reducedDensity(state.rho, [cohort]));
}

/** The Unasked: a cohort's purity is only readable if it was asked recently. */
export function cohortPurityVisible(state: GameState, cohort: number): boolean {
  const c = state.cohorts[cohort];
  if (isHidden(state, cohort)) return false;
  return c.lastAskedSeason !== null && state.season - c.lastAskedSeason < RECENT_ASK_WINDOW;
}

export function isHidden(state: GameState, cohort: number): boolean {
  const h = state.level.hidden;
  return Boolean(h && h.cohort === cohort && state.season < h.untilSeason);
}

export function allowedCrossings(state: GameState): number[] {
  const all: number[] = [];
  for (let k = 1; k <= 2 * state.level.n - 1; k++) all.push(k);
  return state.level.allowedCrossings ? all.filter((k) => state.level.allowedCrossings!.includes(k)) : all;
}

export function canAct(state: GameState, action: GameAction): { ok: boolean; why?: string } {
  if (state.status !== "playing") return { ok: false, why: "The level is over." };
  const allowed = state.level.allowedActions;
  switch (action.type) {
    case "ask": {
      if (!allowed.includes("ASK")) return { ok: false, why: "Asking is not open on this level." };
      if (isHidden(state, action.cohort)) return { ok: false, why: "The register does not list them." };
      return { ok: true };
    }
    case "braid": {
      if (!allowed.includes("BRAID")) return { ok: false, why: "Braiding is not open on this level." };
      if (!allowedCrossings(state).includes(action.k)) return { ok: false, why: `σ${action.k} is not open on this level.` };
      return { ok: true };
    }
    case "care": {
      if (!allowed.includes("CARE")) return { ok: false, why: "Care is not open on this level." };
      if (state.careLeft <= 0) return { ok: false, why: "No care left." };
      if (state.cohorts[action.cohort].deprivation <= 0) return { ok: false, why: "They are not going without." };
      return { ok: true };
    }
    case "wait":
      return allowed.includes("WAIT") || allowed.includes("CARE") ? { ok: true } : { ok: false, why: "You cannot let a season pass here." };
    case "bell":
      return allowed.includes("BELL") && state.level.bell ? { ok: true } : { ok: false, why: "No cut to test." };
  }
}

export function step(prev: GameState, action: GameAction, rng: BornRng): GameState {
  const check = canAct(prev, action);
  if (!check.ok) return prev;
  const state: GameState = {
    ...prev,
    cohorts: prev.cohorts.map((c) => ({ ...c })),
    worldLine: [...prev.worldLine],
    events: [],
    coherenceHistory: [...prev.coherenceHistory],
    flags: { ...prev.flags },
  };
  const season = state.season + 1;

  switch (action.type) {
    case "ask": {
      const pairId = currentPair(state);
      const q = questionFor(pairId, action.basis);
      const draw = { source: "classical-fallback" as RngSource, detail: "" , used: false };
      const res = measure(state.rho, action.cohort, action.basis, () => {
        const d = rng.next();
        draw.source = d.source;
        draw.detail = d.detail;
        draw.used = true;
        return d.u;
      });
      state.rho = res.rho;
      const c = state.cohorts[action.cohort];
      c.lastAskedSeason = season;
      c.lastStance = { questionId: q.id, basis: action.basis, stance: q.stances[res.outcome], season };
      if (action.basis === "Z") c.askedZ++;
      else c.askedX++;
      state.worldLine.push({
        type: "ask",
        cohort: action.cohort,
        basis: action.basis,
        questionId: q.id,
        outcome: res.outcome,
        stance: q.stances[res.outcome],
        p0: res.p0,
        p1: res.p1,
        rngSource: draw.used ? draw.source : "classical-fallback",
        rngDetail: draw.used ? draw.detail : "no draw was needed: the answer was already certain",
        season,
      });
      break;
    }
    case "braid": {
      state.rho = braid(state.rho, action.k, action.inverse);
      state.worldLine.push({ type: "braid", k: action.k, inverse: action.inverse, season });
      break;
    }
    case "care": {
      const c = state.cohorts[action.cohort];
      c.deprivation = Math.max(0, Number((c.deprivation - CARE_STEP).toFixed(4)));
      state.careLeft -= 1;
      state.worldLine.push({ type: "care", cohort: action.cohort, season });
      break;
    }
    case "wait": {
      state.worldLine.push({ type: "wait", season });
      break;
    }
    case "bell": {
      const report = runBellTest(state, rng);
      state.worldLine.push({ type: "bell", season, S: report.S, sampled: report.sampledS });
      state.events.push({ type: "bell", data: report });
      break;
    }
  }

  // environment step: deprivation dephases every cohort
  for (const c of state.cohorts) {
    const p = c.deprivation * DEPHASE_PER_SEASON;
    if (p > 0) state.rho = dephase(state.rho, c.index, Math.min(0.5, p));
  }
  state.season = season;
  state.coherenceHistory.push(purity(state.rho));

  // reveal a hidden cohort
  if (state.level.hidden && season === state.level.hidden.untilSeason) {
    state.events.push({ type: "revealed", cohort: state.level.hidden.cohort });
  }

  // eras (sandbox flavour)
  if (state.level.sandbox) {
    const era = eraIndex(season);
    if (era !== state.era) {
      state.era = era;
      state.events.push({ type: "era", era: ERAS[era] });
    }
  }

  // contact: the mirror
  if (state.level.contact && season === CONTACT_SEASON && !state.contactEntity) {
    const reading = readContact(state.worldLine, currentPair(state));
    state.contactEntity = reading.entity;
    state.events.push({ type: "contact", entityId: reading.entity, reading: { zCount: reading.zCount, xCount: reading.xCount, dominant: reading.dominant } });
  }

  // level 3: once both required crossings have been used, show both orders
  const compare = state.level.goal.params?.compareWords;
  if (Array.isArray(compare) && !state.flags.cloudsShown) {
    const used = new Set(state.worldLine.filter((e) => e.type === "braid" && !e.opening).map((e) => (e as { k: number }).k));
    if ((state.level.allowedCrossings ?? []).every((k) => used.has(k))) {
      state.flags.cloudsShown = true;
      state.events.push({ type: "clouds", data: (compare as string[]).map((w) => cloudSnapshot(state, w)) });
    }
  }

  // goal
  const verdict = evaluateGoal(state);
  if (verdict.status === "won") {
    state.status = "won";
    if (state.level.goal.id === "ask_both_same_cohort") {
      const cmp = orderComparison(state);
      if (cmp) state.events.push({ type: "order", data: cmp });
    }
    state.events.push({ type: "won" });
    return state;
  }
  if (verdict.status === "failed") {
    state.status = "failed";
    state.endReason = verdict.reason ?? "The level failed.";
    state.events.push({ type: "failed", reason: state.endReason });
    return state;
  }

  // final collapse
  const coh = purity(state.rho);
  if (coh < state.level.coherenceThreshold) {
    state.status = "collapsed";
    const mytheme = lastMytheme(state);
    state.endReason = `Coherence fell to ${Math.round(coh * 100)}, below the threshold of ${Math.round(state.level.coherenceThreshold * 100)}.`;
    state.events.push({ type: "collapsed", mytheme });
    return state;
  }

  if (season >= state.level.maxSeasons) {
    if (state.level.goal.id === "none") {
      state.status = "won";
      state.events.push({ type: "won" });
    } else {
      state.status = "failed";
      state.endReason = "The seasons ran out.";
      state.events.push({ type: "failed", reason: state.endReason });
    }
  }
  return state;
}

/** The last three crossings the player made become the mytheme. */
export function lastMytheme(state: GameState): Crossing[] {
  const braids = state.worldLine.filter((e) => e.type === "braid" && !e.opening) as { k: number; inverse: boolean }[];
  return braids.slice(-3).map((b) => ({ k: b.k, inverse: b.inverse }));
}

export function cloudSnapshot(state: GameState, word: string): CloudSnapshot {
  const { base } = initialRho(state.level, state.mythemes);
  const rho = applyWord(base, parseWord(word));
  return {
    label: parseWord(word).map(crossingLabel).join(" then "),
    word,
    cohorts: state.cohorts.map((c) => {
      const z = probabilities(rho, c.index, "Z");
      const x = probabilities(rho, c.index, "X");
      return { name: c.name, color: c.color, z: [z.p0, z.p1], x: [x.p0, x.p1] };
    }),
  };
}

/** Level 1: replay the two asks on one cohort in the other order with the same answers. */
export function orderComparison(state: GameState): OrderComparison | null {
  const cohort = state.cohorts.find((c) => c.askedZ > 0 && c.askedX > 0);
  if (!cohort) return null;
  const asks = state.worldLine.filter((e) => e.type === "ask" && e.cohort === cohort.index) as Extract<WorldLineEntry, { type: "ask" }>[];
  const firstZ = asks.find((a) => a.basis === "Z");
  const firstX = asks.find((a) => a.basis === "X");
  if (!firstZ || !firstX) return null;
  const actualOrder = firstZ.season < firstX.season ? [firstZ, firstX] : [firstX, firstZ];
  const swappedOrder = [actualOrder[1], actualOrder[0]];
  const replay = (order: typeof actualOrder) => {
    let rho = initialRho(state.level, state.mythemes).rho;
    const out: OrderComparison["actual"] = [];
    for (const a of order) {
      const pr = probabilities(rho, cohort.index, a.basis);
      out.push({ questionId: a.questionId, stance: a.stance, p: [pr.p0, pr.p1] });
      const pOutcome = a.outcome === 0 ? pr.p0 : pr.p1;
      if (pOutcome < 1e-9) break;
      rho = measureAxis(rho, cohort.index, a.basis === "Z" ? [0, 0, 1] : [1, 0, 0], () => (a.outcome === 0 ? 0 : 1 - 1e-9)).rho;
    }
    return out;
  };
  return { cohort: cohort.index, actual: replay(actualOrder), swapped: replay(swappedOrder) };
}

export function runBellTest(state: GameState, rng: BornRng): BellReport {
  const cut = state.level.bell!;
  const analytic = chsh(state.rho, cut.a, cut.b);
  const s = analytic.settings;
  const pairs: [typeof s.a, typeof s.b, number][] = [
    [s.a, s.b, 1],
    [s.a, s.bPrime, -1],
    [s.aPrime, s.b, 1],
    [s.aPrime, s.bPrime, 1],
  ];
  const perSetting = BELL_SHOTS / 4;
  let sampledS = 0;
  let source: RngSource = rng.source();
  let first = true;
  for (const [a, b, sign] of pairs) {
    let sum = 0;
    for (let i = 0; i < perSetting; i++) {
      // each shot is a fresh, identically prepared civilization; the live state is untouched
      const ra = measureAxis(state.rho, cut.a, a, () => {
        const d = rng.next();
        if (first) {
          source = d.source;
          first = false;
        }
        return d.u;
      });
      const rb = measureAxis(ra.rho, cut.b, b, () => rng.next().u);
      sum += (ra.outcome === 0 ? 1 : -1) * (rb.outcome === 0 ? 1 : -1);
    }
    sampledS += sign * (sum / perSetting);
  }
  sampledS = Math.abs(sampledS);
  const mi = mutualInformation(state.rho, cut.left, cut.right);
  const minS = Number(state.level.goal.params?.minS ?? 2.2);
  return {
    S: analytic.S,
    E: analytic.E,
    sampledS,
    shots: BELL_SHOTS,
    sampledSource: source,
    mutualInformation: mi,
    won: analytic.S > minS,
  };
}

/** Level 5: what a classical mixture (every cohort secretly decided) would predict. */
export function interferenceReport(state: GameState): { cohort: number; quantum: number; classical: number }[] {
  let cl = state.rho;
  for (let q = 0; q < state.level.n; q++) cl = dephase(cl, q, 0.5);
  return state.cohorts.map((c) => ({
    cohort: c.index,
    quantum: probabilities(state.rho, c.index, "X").p0,
    classical: probabilities(cl, c.index, "X").p0,
  }));
}

export function worldLineText(state: GameState): string {
  return state.worldLine
    .map((e) => {
      switch (e.type) {
        case "braid":
          return crossingLabel({ k: e.k, inverse: e.inverse }) + (e.mytheme ? "ᵐ" : "");
        case "ask":
          return `ask_${e.basis}(${state.cohorts[e.cohort].name})=${e.stance}`;
        case "care":
          return `care(${state.cohorts[e.cohort].name})`;
        case "wait":
          return "·";
        case "bell":
          return `bell(S=${e.S.toFixed(2)})`;
      }
    })
    .join(" ");
}

export function crossingKind(k: number): "internal" | "exchange" {
  return isInternal(k) ? "internal" : "exchange";
}

export function correlationZZ(state: GameState, a: number, b: number): number {
  return expectationProduct(state.rho, [
    { qubit: a, axis: [0, 0, 1] },
    { qubit: b, axis: [0, 0, 1] },
  ]);
}

export function stanceProbabilities(state: GameState, cohort: number, basis: Basis): { p0: number; p1: number } {
  return probabilities(state.rho, cohort, basis);
}
