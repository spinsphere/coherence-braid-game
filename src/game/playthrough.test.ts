import { describe, expect, it } from "vitest";
import { BornRng, parseWord } from "@/sim";
import { LEVELS, levelById } from "@/levels/levels";
import { helpFor } from "@/content/help";
import { createGame, step } from "./engine";
import { describeAction, nextHint } from "./hints";
import type { GameAction, GameState } from "./types";

// A small deterministic generator so every branch of every coin gets exercised
// across seeds without the suite becoming flaky.
function seededUniforms(seed: number, count: number): number[] {
  let x = (seed * 2654435761 + 12345) >>> 0;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
    out.push((x >>> 8) / 16777216);
  }
  return out;
}
const rngOf = (seed: number) => new BornRng(seededUniforms(seed, 400).map((u, i) => ({ u, source: "moth-qrng" as const, detail: `seed ${seed} draw ${i}` })));

/** Play a level with the solver only, the way the Stuck? button does. */
function solve(state: GameState, rng: BornRng, log: string[] = []): GameState {
  let s = state;
  let guard = 0;
  while (s.status === "playing" && guard++ < 60) {
    const h = nextHint(s);
    expect(h.action, `no action for ${s.level.id} at season ${s.season}: ${h.title}`).not.toBeNull();
    expect(h.phase).toBeGreaterThanOrEqual(0);
    expect(h.phase).toBeLessThan(helpFor(s.level.id).stages.length);
    expect(h.why.length).toBeGreaterThan(20);
    const next = step(s, h.action!, rng);
    expect(next, `the hinted action ${describeAction(s, h.action!)} was refused`).not.toBe(s);
    log.push(describeAction(s, h.action!));
    s = next;
  }
  return s;
}

const braids = (word: string): GameAction[] => parseWord(word).map((c) => ({ type: "braid", k: c.k, inverse: c.inverse }));

describe("the whole game can be completed with the solver", () => {
  for (const level of LEVELS) {
    it(`level ${level.index} (${level.title}) is won from the start across many seeds`, () => {
      for (let seed = 0; seed < 12; seed++) {
        const log: string[] = [];
        const end = solve(createGame(level), rngOf(seed), log);
        expect(end.status, `${level.id} seed ${seed}: ${end.endReason}\n${log.join("\n")}`).toBe("won");
        expect(end.season).toBeLessThanOrEqual(level.maxSeasons);
      }
    });
  }

  it("plays every level in order with one shared pool, like a single sitting", () => {
    const rng = rngOf(99);
    const won: string[] = [];
    for (const level of LEVELS) {
      const end = solve(createGame(level), rng);
      expect(end.status).toBe("won");
      won.push(level.id);
    }
    expect(won).toEqual(LEVELS.map((l) => l.id));
  });

  it("the hint timing is fast enough for a button press", () => {
    const g = createGame(levelById("unasked"));
    const t0 = performance.now();
    nextHint(g);
    nextHint(createGame(levelById("federation")));
    nextHint(createGame(levelById("ownership")));
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});

describe("the solver recovers from a player's detours", () => {
  it("level 3: after the wrong order it undoes and finishes", () => {
    const g = createGame(levelById("order"));
    let s = g;
    for (const a of braids("s3")) s = step(s, a, rngOf(1));
    const h = nextHint(s);
    expect(h.action?.type).toBe("braid");
    const end = solve(s, rngOf(1));
    expect(end.status).toBe("won");
    expect(end.season).toBeLessThanOrEqual(4);
  });

  it("level 5: after a stray crossing it still reaches the peace within the seasons", () => {
    const g = createGame(levelById("unasked"));
    let s = g;
    for (const a of braids("s4 s1")) s = step(s, a, rngOf(1));
    expect(solve(s, rngOf(1)).status).toBe("won");
  });

  it("level 2: after the Elders were asked and a few random crossings, it still wins", () => {
    const g = createGame(levelById("crossing"));
    let s = step(g, { type: "ask", cohort: 0, basis: "X" }, rngOf(3));
    for (const a of braids("s1 s3'")) s = step(s, a, rngOf(3));
    expect(solve(s, rngOf(3)).status).toBe("won");
  });

  it("level 4: obligation asked early, then the register, still wins", () => {
    const g = createGame(levelById("ownership"));
    let s = g;
    const rng = rngOf(7);
    s = step(s, { type: "ask", cohort: 0, basis: "X" }, rng);
    s = step(s, { type: "ask", cohort: 1, basis: "X" }, rng);
    expect(solve(s, rng).status).toBe("won");
  });

  it("level 8: after the cut is crossed too early the solver still finds a violation", () => {
    const g = createGame(levelById("federation"));
    let s = g;
    for (const a of braids("s4")) s = step(s, a, rngOf(1));
    expect(solve(s, rngOf(1)).status).toBe("won");
  });

  it("recommends a restart when the seasons cannot suffice", () => {
    const g = createGame(levelById("order"));
    let s = g;
    for (const a of braids("s3 s3 s3 s2 s2 s2 s3")) s = step(s, a, rngOf(1));
    const h = nextHint(s);
    expect(h.restart || (h.action !== null && solve(s, rngOf(1)).status === "won")).toBeTruthy();
  });

  it("says the level is over once it is", () => {
    let s = createGame(levelById("river"));
    s = solve(s, rngOf(2));
    const h = nextHint(s);
    expect(h.action).toBeNull();
    expect(h.title).toContain("over");
  });
});
