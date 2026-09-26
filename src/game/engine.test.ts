import { describe, expect, it } from "vitest";
import { BornRng, parseWord, purity } from "@/sim";
import { LEVELS, levelById } from "@/levels/levels";
import { createGame, step, coherence, interferenceReport, cohortPurityVisible, isHidden } from "./engine";
import type { GameAction, GameState } from "./types";

// deterministic rng: a fixed sequence of uniforms
const rngOf = (seq: number[]) => new BornRng(seq.map((u, i) => ({ u, source: "moth-qrng" as const, detail: `test ${i}` })));

function play(state: GameState, actions: GameAction[], rng = rngOf([])): GameState {
  let s = state;
  for (const a of actions) s = step(s, a, rng);
  return s;
}

const braids = (word: string): GameAction[] => parseWord(word).map((c) => ({ type: "braid", k: c.k, inverse: c.inverse }));

describe("levels are consistent", () => {
  it("every level has matching deprivation length and valid crossings", () => {
    for (const l of LEVELS) {
      expect(l.deprivation.length).toBe(l.n);
      expect(l.intro.split(/\s+/).length).toBeLessThanOrEqual(60);
      expect(l.intro).not.toContain("!");
      for (const k of l.allowedCrossings ?? []) expect(k).toBeLessThanOrEqual(2 * l.n - 1);
      const g = createGame(l);
      expect(purity(g.rho)).toBeCloseTo(1, 10);
    }
  });
});

describe("level 1: The River", () => {
  it("wins after asking both questions of one cohort and shows the swapped order", () => {
    const g = createGame(levelById("river"));
    const s = play(g, [{ type: "ask", cohort: 0, basis: "Z" }, { type: "ask", cohort: 0, basis: "X" }], rngOf([0.7]));
    expect(s.status).toBe("won");
    const order = s.events.find((e) => e.type === "order");
    expect(order).toBeTruthy();
    if (order && order.type === "order") {
      expect(order.data.actual[0].p[0]).toBeCloseTo(1, 10); // river was certain first
      expect(order.data.actual[1].p[0]).toBeCloseTo(0.5, 10);
      expect(order.data.swapped[0].p[0]).toBeCloseTo(0.5, 10); // neighbour first is a coin
      expect(order.data.swapped[1].p[0]).toBeCloseTo(0.5, 10); // and then the river is too
    }
    const ask = s.worldLine.find((e) => e.type === "ask" && e.basis === "X");
    expect(ask && ask.type === "ask" && ask.rngSource).toBe("moth-qrng");
  });
  it("does not allow braiding", () => {
    const g = createGame(levelById("river"));
    expect(step(g, { type: "braid", k: 1, inverse: false }, rngOf([]))).toBe(g);
  });
});

describe("level 2: The Crossing", () => {
  it("cannot be won by braiding alone but is won by ask_X(Elders) then s2 s3(')", () => {
    const g = createGame(levelById("crossing"));
    const s1 = play(g, braids("s1 s2 s3 s2"));
    expect(s1.status).toBe("playing");
    // outcome + (u < 0.5) then s2 s3' gives GUEST; outcome - then s2 s3 gives GUEST
    const plus = play(g, [{ type: "ask", cohort: 0, basis: "X" }, ...braids("s2 s3'")], rngOf([0.2]));
    expect(plus.status).toBe("won");
    const minus = play(g, [{ type: "ask", cohort: 0, basis: "X" }, ...braids("s2 s3")], rngOf([0.8]));
    expect(minus.status).toBe("won");
  });
  it("fails if the Smiths are asked the neighbour question", () => {
    const g = createGame(levelById("crossing"));
    const s = play(g, [{ type: "ask", cohort: 1, basis: "X" }], rngOf([0.2]));
    expect(s.status).toBe("failed");
  });
});

describe("level 3: Order", () => {
  it("s2 then s3 wins, s3 then s2 does not, and both clouds are shown", () => {
    const g = createGame(levelById("order"));
    const win = play(g, braids("s2 s3"));
    expect(win.status).toBe("won");
    const lose = play(g, braids("s3 s2"));
    expect(lose.status).toBe("playing");
    expect(lose.events.some((e) => e.type === "clouds")).toBe(true);
    expect(step(g, { type: "braid", k: 1, inverse: false }, rngOf([]))).toBe(g);
  });
});

describe("level 4: Ownership and Obligation", () => {
  it("is solvable with two register asks", () => {
    const g = createGame(levelById("ownership"));
    // ask X on Elders (+), braid obligation across, ask X on the others, then write the register and braid it back
    const s = play(
      g,
      [
        { type: "ask", cohort: 0, basis: "X" }, // OWED (u=0.1)
        ...braids("s2 s3 s4 s5"),
        { type: "ask", cohort: 1, basis: "X" },
        { type: "ask", cohort: 2, basis: "X" },
        { type: "ask", cohort: 0, basis: "Z" }, // register 1: makes Elders' obligation indefinite
        { type: "ask", cohort: 0, basis: "Z" }, // register 2: certain now
        ...braids("s2 s1"), // recover obligation from the Smiths by exchange
        { type: "ask", cohort: 0, basis: "X" },
      ],
      rngOf([0.1, 0.3, 0.3, 0.3, 0.3, 0.3]),
    );
    expect(s.status).toBe("won");
  });
});

describe("level 5: The Unasked", () => {
  it("wins by braiding s2 s3 s4 s5 and shows an interference gap; any ask fails", () => {
    const g = createGame(levelById("unasked"));
    const mid = play(g, braids("s2 s3 s4"));
    const rep = interferenceReport(mid);
    expect(rep[1].quantum).toBeCloseTo(1, 10);
    expect(rep[1].classical).toBeCloseTo(0.5, 10);
    const win = play(mid, braids("s5"));
    expect(win.status).toBe("won");
    const fail = play(g, [{ type: "ask", cohort: 2, basis: "Z" }], rngOf([0.1]));
    expect(fail.status).toBe("failed");
  });
});

describe("level 6: Care", () => {
  it("collapses without care, survives with care first and asks late", () => {
    const g = createGame(levelById("care"));
    const askAll: GameAction[] = [
      { type: "ask", cohort: 1, basis: "X" },
      { type: "ask", cohort: 2, basis: "X" },
      { type: "ask", cohort: 0, basis: "X" },
      { type: "ask", cohort: 3, basis: "X" },
    ];
    const careless = play(g, [...askAll, ...Array(6).fill({ type: "wait" })], rngOf([0.1, 0.1, 0.1, 0.1]));
    expect(careless.status).toBe("collapsed");
    const careful = play(
      g,
      [
        { type: "care", cohort: 1 },
        { type: "care", cohort: 1 },
        { type: "care", cohort: 2 },
        { type: "care", cohort: 2 },
        { type: "wait" },
        { type: "wait" },
        ...askAll,
      ],
      rngOf([0.1, 0.1, 0.1, 0.1]),
    );
    expect(careful.status).toBe("won");
    expect(coherence(careful)).toBeGreaterThanOrEqual(0.6);
    expect(careful.contactEntity).toBeTruthy();
  });
});

describe("level 7: Suppression", () => {
  it("hides the Newcomers until season 6, collapses without care, survives with care", () => {
    const g = createGame(levelById("suppression"));
    expect(isHidden(g, 3)).toBe(true);
    expect(step(g, { type: "ask", cohort: 3, basis: "Z" }, rngOf([]))).toBe(g);
    expect(cohortPurityVisible(g, 0)).toBe(false);
    const idle = play(g, Array(12).fill({ type: "wait" }));
    expect(idle.status).toBe("collapsed");
    const cared = play(g, [...Array(4).fill({ type: "care", cohort: 3 }), ...Array(8).fill({ type: "wait" })]);
    expect(cared.status).toBe("won");
    expect(isHidden(cared, 3)).toBe(false);
  });
});

describe("level 8: The Federation", () => {
  it("s4 alone is not enough after the opening; s2' then s4 passes the Bell test", () => {
    const g = createGame(levelById("federation"));
    const weak = play(g, [...braids("s4"), { type: "bell" }], rngOf([]));
    expect(weak.status).toBe("playing");
    const bell = weak.events.find((e) => e.type === "bell");
    expect(bell && bell.type === "bell" && bell.data.S).toBeLessThan(2.2);
    const strong = play(g, [...braids("s2' s4"), { type: "bell" }], rngOf([]));
    expect(strong.status).toBe("won");
    const rep = strong.events.find((e) => e.type === "bell");
    if (rep && rep.type === "bell") {
      expect(rep.data.S).toBeCloseTo(2 * Math.SQRT2, 6);
      expect(rep.data.sampledS).toBeGreaterThan(2);
      expect(rep.data.mutualInformation).toBeCloseTo(2, 6);
    }
  });
});

describe("sandbox", () => {
  it("seeds from the labyrinth, rotates eras, and turns a collapse into a mytheme", () => {
    const g = createGame(levelById("sandbox"));
    expect(g.level.allowedCrossings).not.toContain(6); // the wall between rooms 2 and 3
    expect(g.level.allowedCrossings).toContain(4);
    const s = play(g, [...braids("s2 s4 s8"), { type: "wait" }, { type: "wait" }]);
    expect(s.era).toBe(1);
    expect(s.events.some((e) => e.type === "era") || s.season === 5).toBeTruthy();
    // force a collapse by dephasing many superposed cohorts over time
    let t = s;
    const rng = rngOf([]);
    while (t.status === "playing") t = step(t, { type: "wait" }, rng);
    if (t.status === "collapsed") {
      const ev = t.events.find((e) => e.type === "collapsed");
      expect(ev && ev.type === "collapsed" && ev.mytheme.length).toBe(3);
      const next = createGame(levelById("sandbox"), [ev && ev.type === "collapsed" ? ev.mytheme : []]);
      expect(next.worldLine.filter((e) => e.type === "braid" && e.mytheme).length).toBe(3);
    }
  });
});
