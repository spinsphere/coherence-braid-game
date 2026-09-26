// The Stuck? solver. Given any live game state it names the next action that
// moves the civilization toward the level's goal, says why, and reports which
// stage of the level the player is at. It is pure: braids are explored with
// the real reducer (they never draw randomness), asks are recommended but
// never simulated, so the hint is honest about coins.

import { BornRng, chshOf, crossingLabel, crossingTargets, inverseWord, isInternal, parseWord, probabilities, type Crossing } from "@/sim";
import { helpFor } from "@/content/help";
import { evaluateGoal } from "@/levels/goals";
import { allowedCrossings, canAct, coherence, currentPair, isHidden, step } from "./engine";
import { questionFor } from "./questions";
import type { GameAction, GameState, WorldLineEntry } from "./types";

export interface Hint {
  /** what to do next; null when the level is over or a restart is the only way */
  action: GameAction | null;
  /** index into helpFor(level.id).stages */
  phase: number;
  /** short imperative, e.g. "Ask the Elders: The river" */
  title: string;
  /** one or two sentences on why this is the move */
  why: string;
  /** the move is a fair coin (an ask with p < 0.99 either way) */
  coin?: boolean;
  /** the state cannot reach the goal within the seasons left */
  restart?: boolean;
}

const CERTAIN = 0.99;

/** The plain-language name of an action in this state. */
export function describeAction(state: GameState, action: GameAction): string {
  const names = state.cohorts.map((c) => c.name);
  switch (action.type) {
    case "ask": {
      const q = questionFor(currentPair(state), action.basis);
      return `Ask the ${names[action.cohort]}: ${q.label} (“${q.prompt}”)`;
    }
    case "braid": {
      const t = crossingTargets(action.k, state.level.n);
      const label = crossingLabel({ k: action.k, inverse: action.inverse });
      return isInternal(action.k) ? `Braid ${label}, a ritual within the ${names[t[0]]}` : `Braid ${label}, an exchange between the ${names[t[0]]} and the ${names[t[1]]}`;
    }
    case "care":
      return isHidden(state, action.cohort) ? "Give care to the unlisted cohort" : `Give care to the ${names[action.cohort]}`;
    case "wait":
      return "Let the season pass";
    case "bell":
      return "Run the Bell test";
  }
}

/** Where the civilization stands, for the popup: season, coherence, goal progress. */
export function describeSituation(state: GameState): string {
  const v = evaluateGoal(state);
  const coh = Math.round(coherence(state) * 100);
  const parts = [`Season ${state.season} of ${state.level.maxSeasons}.`, `Coherence ${coh} (threshold ${Math.round(state.level.coherenceThreshold * 100)}).`];
  if (v.progress) parts.push(v.progress);
  return parts.join(" ");
}

export function nextHint(state: GameState): Hint {
  if (state.status !== "playing") {
    return { action: null, phase: helpFor(state.level.id).stages.length - 1, title: "The level is over", why: state.status === "won" ? state.level.winText : (state.endReason ?? "Begin again.") };
  }
  const fn = STRATEGIES[state.level.id] ?? genericStrategy;
  const h = fn(state);
  if (h.action && !canAct(state, h.action).ok) return restart(state, "The move the solver wanted is not open here.");
  return h;
}

// ---------------------------------------------------------------- helpers

const dummyRng = new BornRng([]);

function braidMoves(state: GameState): GameAction[] {
  const out: GameAction[] = [];
  for (const k of allowedCrossings(state)) {
    out.push({ type: "braid", k, inverse: false });
    out.push({ type: "braid", k, inverse: true });
  }
  return out;
}

function seasonsLeft(state: GameState): number {
  return state.level.maxSeasons - state.season;
}

/**
 * Breadth-first search over braid words of length <= maxDepth for the
 * shortest one whose end state satisfies `goal`. Braids draw no randomness,
 * so the real reducer is used and deprivation, seasons and collapse are all
 * accounted for. Returns null when nothing short enough works.
 */
export function searchBraids(state: GameState, maxDepth: number, goal: (s: GameState) => boolean): GameAction[] | null {
  if (goal(state)) return [];
  const depthCap = Math.min(maxDepth, seasonsLeft(state));
  const moves = braidMoves(state);
  let frontier: { s: GameState; path: GameAction[] }[] = [{ s: state, path: [] }];
  for (let depth = 1; depth <= depthCap; depth++) {
    const next: typeof frontier = [];
    for (const node of frontier) {
      const last = node.path[node.path.length - 1];
      for (const m of moves) {
        if (m.type !== "braid") continue;
        if (last && last.type === "braid" && last.k === m.k && last.inverse !== m.inverse) continue; // undoing the last move
        const ns = step(node.s, m, dummyRng);
        if (ns === node.s) continue;
        const path = [...node.path, m];
        if (goal(ns) && (ns.status === "playing" || ns.status === "won")) return path;
        if (ns.status !== "playing") continue;
        next.push({ s: ns, path });
      }
    }
    frontier = next;
  }
  return null;
}

function toAction(c: Crossing): GameAction {
  return { type: "braid", k: c.k, inverse: c.inverse };
}

function playerBraids(state: GameState): Crossing[] {
  return state.worldLine.filter((e): e is Extract<WorldLineEntry, { type: "braid" }> => e.type === "braid" && !e.opening).map((e) => ({ k: e.k, inverse: e.inverse }));
}

/** Cancel adjacent σₖσₖ⁻¹ pairs until none remain. */
export function freeReduce(word: readonly Crossing[]): Crossing[] {
  const out: Crossing[] = [];
  for (const c of word) {
    const top = out[out.length - 1];
    if (top && top.k === c.k && top.inverse !== c.inverse) out.pop();
    else out.push(c);
  }
  return out;
}

/** Undo everything the player braided (after cancelling what already undid itself), then braid the target word exactly. */
function undoThenTarget(state: GameState, targetWord: string): GameAction[] {
  return [...inverseWord(freeReduce(playerBraids(state))).map(toAction), ...parseWord(targetWord).map(toAction)];
}

function restart(state: GameState, why: string): Hint {
  return { action: null, phase: 0, title: "Begin the level again", why: `${why} There are ${seasonsLeft(state)} seasons left, which is not enough to recover. Replay the level and let the hints walk you through.`, restart: true };
}

function braidHint(state: GameState, action: GameAction, phase: number, why: string): Hint {
  return { action, phase, title: describeAction(state, action), why };
}

function askHint(state: GameState, cohort: number, basis: "Z" | "X", phase: number, why: string): Hint {
  const pr = probabilities(state.rho, cohort, basis);
  const coin = Math.max(pr.p0, pr.p1) < CERTAIN;
  const q = questionFor(currentPair(state), basis);
  const odds = coin ? ` Right now ${q.stances[0]} is ${pr.p0.toFixed(2)} and ${q.stances[1]} is ${pr.p1.toFixed(2)}, so the Born rule will draw.` : ` The answer is already certain (${pr.p0 >= CERTAIN ? q.stances[0] : q.stances[1]}), so no draw is needed.`;
  return { action: { type: "ask", cohort, basis }, phase, title: describeAction(state, { type: "ask", cohort, basis }), why: why + odds, coin };
}

function mostDeprived(state: GameState): number {
  let best = -1;
  let bestD = 0;
  for (const c of state.cohorts) {
    if (c.deprivation > bestD) {
      bestD = c.deprivation;
      best = c.index;
    }
  }
  return best;
}

function careOrWait(state: GameState, carePhase: number, waitPhase: number, careWhy: string, waitWhy: string): Hint {
  const who = mostDeprived(state);
  if (who >= 0 && state.careLeft > 0 && canAct(state, { type: "care", cohort: who }).ok) {
    const c = state.cohorts[who];
    return { action: { type: "care", cohort: who }, phase: carePhase, title: describeAction(state, { type: "care", cohort: who }), why: `${careWhy} ${isHidden(state, who) ? "The unlisted cohort" : `The ${c.name}`} are the most deprived (${c.deprivation.toFixed(2)}), eroding ${(c.deprivation * 25).toFixed(1)}% of their coherence a season.` };
  }
  return { action: { type: "wait" }, phase: waitPhase, title: describeAction(state, { type: "wait" }), why: waitWhy };
}

// ------------------------------------------------------------- strategies

type Strategy = (state: GameState) => Hint;

const river: Strategy = (state) => {
  const started = state.cohorts.find((c) => c.askedZ > 0 || c.askedX > 0);
  const cohort = started ? started.index : 0;
  const c = state.cohorts[cohort];
  if (c.askedZ === 0)
    return askHint(state, cohort, "Z", 0, `Ask the register question first. The founding state is a Z eigenstate, so the ${c.name} already know what the river is and the answer costs nothing.`);
  return askHint(state, cohort, "X", 1, `Now the incompatible question. Because the river answer is sharp, the neighbour answer cannot be: it is a fair coin. When it lands, the level shows the order you did not choose.`);
};

const crossing: Strategy = (state) => {
  const p = state.level.goal.params ?? {};
  const target = Number(p.cohort);
  const source = state.cohorts.find((c) => c.index !== target && c.askedX > 0);
  if (!source) {
    const src = state.cohorts.find((c) => c.index !== target)!.index;
    return askHint(state, src, "X", 0, `Braiding conserves parity: from the founding state no cohort can become certain of an X answer by braiding alone. Someone has to be asked so a fact exists. Ask the ${state.cohorts[src].name}, never the ${state.cohorts[target].name}.`);
  }
  const path = searchBraids(state, 4, (s) => s.status === "won");
  if (!path || path.length === 0) return restart(state, "No short braid word reaches the certainty from here.");
  const a = path[0];
  const k = a.type === "braid" ? a.k : 0;
  const stance = source.lastStance?.stance ?? "?";
  const why = isInternal(k)
    ? `The fact is now shared across both cohorts. A ritual within the ${state.cohorts[target].name} rotates their phase so the shared fact faces the neighbour question. Because the ${source.name} said ${stance}, the ritual goes ${a.type === "braid" && a.inverse ? "under" : "over"}. ${path.length - 1} crossing${path.length === 2 ? "" : "s"} to go after this.`
    : `The ${source.name} hold a sharp fact (${stance}). An exchange entangles them with the ${state.cohorts[target].name}, and the fact travels along the braid. ${path.length - 1} crossing${path.length === 2 ? "" : "s"} to go after this.`;
  return braidHint(state, a, isInternal(k) ? 2 : 1, why);
};

function fidelityStrategy(state: GameState, whyFor: (a: GameAction, remaining: number) => string): Hint {
  const targetWord = String(state.level.goal.params?.targetWord ?? "");
  let path = searchBraids(state, 3, (s) => s.status === "won");
  if (!path) {
    const plan = undoThenTarget(state, targetWord);
    if (plan.length <= seasonsLeft(state)) path = plan;
  }
  if (!path || path.length === 0) return restart(state, "No braid word short enough reaches the target from here.");
  const a = path[0];
  const done = parseWord(targetWord).length - path.length;
  const phase = Math.max(0, Math.min(helpFor(state.level.id).stages.length - 1, done));
  return braidHint(state, a, phase, whyFor(a, path.length - 1));
}

const order: Strategy = (state) =>
  fidelityStrategy(state, (a, remaining) => {
    if (a.type !== "braid") return "";
    const undo = freeReduce(playerBraids(state)).length > 0 && remaining >= 2;
    if (undo) return `That last crossing put the civilization in the wrong order. Braiding is reversible: this undoes it, then σ₂ before σ₃ reaches the target.`;
    return isInternal(a.k)
      ? `The exchange has spread the Elders' certainty of RELY to the Smiths. The ritual σ₃ now turns the Smiths so the trust question reads sharp. Done the other way round, the ritual would have turned nothing.`
      : `Exchange first. σ₂ carries the Elders' certainty across to the Smiths; a ritual on the Smiths before that would act on a cohort that holds nothing yet.`;
  });

const unasked: Strategy = (state) =>
  fidelityStrategy(state, (a, remaining) => {
    if (a.type !== "braid") return "";
    const t = crossingTargets(a.k, state.level.n);
    const undo = freeReduce(playerBraids(state)).length > 0 && remaining >= parseWord(String(state.level.goal.params?.targetWord)).length;
    if (undo) return `This undoes a crossing that led away from the peace. Braiding never costs coherence, so a detour is free apart from the season it takes.`;
    return isInternal(a.k)
      ? `A ritual within the ${state.cohorts[t[0]].name} turns the shared welcome to face the hospitality question. Watch their quantum p(ENTER) rise while the classical mixture stays at 0.50: that gap is interference. ${remaining} crossing${remaining === 1 ? "" : "s"} to go.`
      : `An exchange carries the welcome from the ${state.cohorts[t[0]].name} to the ${state.cohorts[t[1]].name}. No one is asked, so nothing is decided; the possibility itself travels. ${remaining} crossing${remaining === 1 ? "" : "s"} to go.`;
  });

const ownership: Strategy = (state) => {
  const minZ = Number(state.level.goal.params?.minZ ?? 2);
  const qX = questionFor(state.level.questionPair, "X");
  const owed = (i: number) => {
    const s = state.cohorts[i].lastStance;
    return Boolean(s && s.basis === "X" && s.stance === qX.stances[0]);
  };
  const zAsks = state.worldLine.filter((e) => e.type === "ask" && e.basis === "Z").length;
  if (zAsks < minZ) {
    const who = state.cohorts.find((c) => !owed(c.index)) ?? state.cohorts[0];
    return askHint(state, who.index, "Z", 0, `Write the register before settling obligation. Ownership and obligation are incompatible: a sharp ownership answer would erase an OWED answer, so the ${minZ} register entries go first, on a cohort whose obligation is not yet settled. ${minZ - zAsks} to go.`);
  }
  const pending = state.cohorts.find((c) => !owed(c.index));
  if (!pending) return { action: { type: "wait" }, phase: 2, title: "Let the season pass", why: "Everything is in place; the goal check runs at the end of the season." };
  const i = pending.index;
  const pr = probabilities(state.rho, i, "X");
  if (pr.p0 >= CERTAIN) return askHint(state, i, "X", 2, `The ${pending.name} are already certain of ${qX.stances[0]}. Asking makes it their latest answer, and the register keeps its entries because no one asks about ownership again.`);
  const path = searchBraids(state, 3, (s) => probabilities(s.rho, i, "X").p0 >= CERTAIN);
  if (path && path.length > 0) {
    const a = path[0];
    const k = a.type === "braid" ? a.k : 0;
    const why =
      pr.p1 >= CERTAIN
        ? `The ${pending.name} answered ${qX.stances[1]}. That is not the end: a ritual is a quarter turn about the register axis, and two of them turn ${qX.stances[1]} into ${qX.stances[0]} exactly. ${path.length} crossing${path.length === 1 ? "" : "s"}, then ask again.`
        : `${isInternal(k) ? "A ritual" : "An exchange"} moves the ${pending.name} toward certainty of ${qX.stances[0]} (now ${pr.p0.toFixed(2)}). ${path.length} crossing${path.length === 1 ? "" : "s"}, then ask.`;
    return braidHint(state, a, 1, why);
  }
  return askHint(state, i, "X", 2, `No short braid makes the ${pending.name} certain, so ask and let the Born rule decide. If it lands ${qX.stances[1]}, two rituals will turn it around.`);
};

const care: Strategy = (state) => {
  const unasked = state.cohorts.filter((c) => c.askedX === 0);
  const left = seasonsLeft(state);
  if (unasked.length > 0 && left <= unasked.length) {
    const who = [...unasked].sort((a, b) => a.deprivation - b.deprivation || a.index - b.index)[0];
    return askHint(state, who.index, "X", 2, `Ask now: ${unasked.length} cohort${unasked.length === 1 ? "" : "s"} still unasked and ${left} season${left === 1 ? "" : "s"} left. An answered need is a superposition that deprivation erodes, so the least deprived go first and no answer waits longer than it must.`);
  }
  if (unasked.length === 0) return { action: { type: "wait" }, phase: 2, title: "Let the season pass", why: "Everyone has answered. Hold coherence above 60 until the tenth season ends." };
  return careOrWait(state, 0, 1, "Care first. Every 0.1 of deprivation removed is 2.5% of a cohort's coherence kept each season once they have been asked.", `Nothing is at stake yet: unasked cohorts sit in register states, which deprivation cannot erode. Let the seasons pass and ask in the last ${unasked.length}.`);
};

const suppression: Strategy = (state) => {
  const worst = mostDeprived(state);
  if (worst >= 0 && state.careLeft > 0 && state.cohorts[worst].deprivation > 0.05) {
    return careOrWait(state, 0, 1, "The dial reads lower than three listed cohorts can explain. Someone unlisted is going without, and care reaches them even though no question does.", "");
  }
  return { action: { type: "wait" }, phase: state.season >= (state.level.hidden?.untilSeason ?? 0) ? 2 : 1, title: "Let the season pass", why: "The listed cohorts sit in register states and do not erode, and the unlisted one has been cared for. Do not braid or ask: a superposition would start to fade. Hold until season 12." };
};

const federation: Strategy = (state) => {
  const cut = state.level.bell!;
  const minS = Number(state.level.goal.params?.minS ?? 2.2);
  const live = (s: GameState) => chshOf(s.rho, cut.a, cut.b).S;
  if (live(state) > minS) return { action: { type: "bell" }, phase: 2, title: "Run the Bell test", why: `Live S is ${live(state).toFixed(2)}, above the classical bound of 2. Two hundred sampled shots will scatter around the exact value; nothing agreed in advance could produce it.` };
  const path = searchBraids(state, 3, (s) => live(s) > minS);
  if (!path || path.length === 0) return restart(state, "No short braid word produces a Bell violation from here.");
  const a = path[0];
  const k = a.type === "braid" ? a.k : 0;
  const t = crossingTargets(k, state.level.n);
  const crossesCut = !isInternal(k) && cut.left.includes(t[0]) && cut.right.includes(t[1]);
  const why = crossesCut
    ? `σ₄ is the only exchange that crosses the cut. With the ${state.cohorts[cut.a].name} unbound, it makes them and the ${state.cohorts[cut.b].name} a maximally entangled pair, and S will read 2√2.`
    : `The opening braid tied the ${state.cohorts[t[0]].name} to ${isInternal(k) ? "a ritual" : `the ${state.cohorts[t[1]].name}`}. An alliance across the cut needs the ${state.cohorts[cut.a].name} free of other braids first, so this crossing undoes that binding. ${path.length - 1} crossing${path.length === 2 ? "" : "s"} to go before the test.`;
  return braidHint(state, a, crossesCut ? 1 : 0, why);
};

const sandbox: Strategy = (state) =>
  careOrWait(state, 0, 1, "There is no goal in deep time but staying one thing. Care while care is left.", `Let the era turn. Unbraided, unasked cohorts do not erode; ${seasonsLeft(state)} season${seasonsLeft(state) === 1 ? "" : "s"} of deep time remain.`);

const genericStrategy: Strategy = (state) => careOrWait(state, 0, 0, "Care for the most deprived.", "Let the season pass.");

const STRATEGIES: Record<string, Strategy> = { river, crossing, order, ownership, unasked, care, suppression, federation, sandbox };
