import { describe, expect, it } from "vitest";
import {
  applyUnitary,
  dephase,
  expectationProduct,
  fromStateVector,
  H_GATE,
  identityState,
  measure,
  measureExpectation,
  probabilities,
  purity,
  reducedDensity,
  overlap,
  type Gate,
  type Rho,
} from "./density";
import { braid, crossingTargets, parseWord, SIGMA_EVEN, SIGMA_ODD, sigmaGate, wordFromStart, wordLabel, type Crossing } from "./braid";
import { chsh, mutualInformation, vonNeumannEntropy } from "./info";
import { exportQasm } from "./qasm";
import { BornRng, buildPool, uniformFromBinomialCount, uniformsFromBytes } from "./rng";

// ---------- test-only helpers: full matrices of braid words ----------

type CVec = { re: Float64Array; im: Float64Array };

function applyGateToVector(v: CVec, g: Gate, targets: number[], n: number): CVec {
  const dim = 1 << n;
  const k = g.k;
  const sub = 1 << k;
  const out = { re: new Float64Array(dim), im: new Float64Array(dim) };
  let mask = 0;
  for (const t of targets) mask |= 1 << (n - 1 - t);
  const ins = (s: number) => {
    let m = 0;
    for (let i = 0; i < k; i++) if ((s >> (k - 1 - i)) & 1) m |= 1 << (n - 1 - targets[i]);
    return m;
  };
  for (let b = 0; b < dim; b++) {
    if (b & mask) continue;
    for (let s2 = 0; s2 < sub; s2++) {
      let r = 0;
      let i = 0;
      for (let s = 0; s < sub; s++) {
        const ur = g.re[s2 * sub + s];
        const ui = g.im[s2 * sub + s];
        const vr = v.re[b | ins(s)];
        const vi = v.im[b | ins(s)];
        r += ur * vr - ui * vi;
        i += ur * vi + ui * vr;
      }
      out.re[b | ins(s2)] = r;
      out.im[b | ins(s2)] = i;
    }
  }
  return out;
}

function fullMatrix(word: Crossing[], n: number): CVec[] {
  const dim = 1 << n;
  const cols: CVec[] = [];
  for (let j = 0; j < dim; j++) {
    let v: CVec = { re: new Float64Array(dim), im: new Float64Array(dim) };
    v.re[j] = 1;
    for (const c of word) v = applyGateToVector(v, sigmaGate(c.k, c.inverse), crossingTargets(c.k, n), n);
    cols.push(v);
  }
  return cols;
}

function matDiff(a: CVec[], b: CVec[]): number {
  let d = 0;
  for (let j = 0; j < a.length; j++)
    for (let i = 0; i < a[j].re.length; i++) d = Math.max(d, Math.hypot(a[j].re[i] - b[j].re[i], a[j].im[i] - b[j].im[i]));
  return d;
}

function gateTimesDagger(g: Gate): number {
  // max |(U U†)[r,c] - delta| over the gate
  const d = 1 << g.k;
  let worst = 0;
  for (let r = 0; r < d; r++)
    for (let c = 0; c < d; c++) {
      let re = 0;
      let im = 0;
      for (let k = 0; k < d; k++) {
        // U[r,k] * conj(U[c,k])
        const ar = g.re[r * d + k];
        const ai = g.im[r * d + k];
        const br = g.re[c * d + k];
        const bi = -g.im[c * d + k];
        re += ar * br - ai * bi;
        im += ar * bi + ai * br;
      }
      worst = Math.max(worst, Math.hypot(re - (r === c ? 1 : 0), im));
    }
  return worst;
}

function plusState(): Rho {
  return applyUnitary(identityState(1), H_GATE, [0]);
}

// ---------- tests ----------

describe("braid generators", () => {
  it("are unitary (sigma_k sigma_k^dagger = I) for both kinds and their inverses", () => {
    for (const g of [SIGMA_ODD, SIGMA_EVEN, sigmaGate(1, true), sigmaGate(2, true)]) {
      expect(gateTimesDagger(g)).toBeLessThan(1e-12);
    }
  });

  it("sigma_k^{-1} undoes sigma_k on a density matrix", () => {
    const n = 3;
    for (let k = 1; k <= 2 * n - 1; k++) {
      const start = wordFromStart(n, parseWord("s2 s3 s1"));
      const back = braid(braid(start, k, false), k, true);
      expect(overlap(start, back)).toBeCloseTo(1, 10);
    }
  });

  it("satisfy Yang-Baxter: sigma_k sigma_{k+1} sigma_k = sigma_{k+1} sigma_k sigma_{k+1}", () => {
    const n = 3;
    for (let k = 1; k <= 2 * n - 2; k++) {
      const lhs = fullMatrix([{ k, inverse: false }, { k: k + 1, inverse: false }, { k, inverse: false }], n);
      const rhs = fullMatrix([{ k: k + 1, inverse: false }, { k, inverse: false }, { k: k + 1, inverse: false }], n);
      expect(matDiff(lhs, rhs)).toBeLessThan(1e-12);
    }
  });

  it("satisfy far commutation: sigma_k sigma_l = sigma_l sigma_k for |k-l| >= 2", () => {
    const n = 3;
    for (let k = 1; k <= 2 * n - 1; k++)
      for (let l = k + 2; l <= 2 * n - 1; l++) {
        const lhs = fullMatrix([{ k, inverse: false }, { k: l, inverse: false }], n);
        const rhs = fullMatrix([{ k: l, inverse: false }, { k, inverse: false }], n);
        expect(matDiff(lhs, rhs)).toBeLessThan(1e-12);
      }
  });

  it("do not commute for adjacent generators (the order-effect mechanic)", () => {
    const n = 3;
    for (let k = 1; k <= 2 * n - 2; k++) {
      const lhs = fullMatrix([{ k, inverse: false }, { k: k + 1, inverse: false }], n);
      const rhs = fullMatrix([{ k: k + 1, inverse: false }, { k, inverse: false }], n);
      expect(matDiff(lhs, rhs)).toBeGreaterThan(0.1);
    }
  });

  it("sigma_2 on |00> gives (|00> - i|11>)/sqrt2", () => {
    const rho = braid(identityState(2), 2);
    const s = Math.SQRT1_2;
    const target = fromStateVector(2, [s, 0, 0, 0], [0, 0, 0, -s]);
    expect(overlap(rho, target)).toBeCloseTo(1, 12);
  });

  it("braiding never reduces purity", () => {
    let rho = identityState(3);
    for (const c of parseWord("s2 s3' s4 s1 s5 s2'")) {
      rho = braid(rho, c.k, c.inverse);
      expect(purity(rho)).toBeCloseTo(1, 12);
    }
  });

  it("formats and parses words", () => {
    const w = parseWord("s2 s1' s3");
    expect(wordLabel(w)).toBe("σ₂ σ₁⁻¹ σ₃");
    expect(parseWord("σ₂ σ₁⁻¹ σ₃")).toEqual(w);
  });
});

describe("density matrix", () => {
  it("purity of a pure state is 1", () => {
    expect(purity(identityState(3))).toBeCloseTo(1, 12);
    expect(purity(plusState())).toBeCloseTo(1, 12);
  });

  it("purity after a full dephase of |+> is 0.5", () => {
    expect(purity(dephase(plusState(), 0, 0.5))).toBeCloseTo(0.5, 12);
  });

  it("Born probabilities of |+> in Z are 0.5 / 0.5, in X are 1 / 0", () => {
    const p = probabilities(plusState(), 0, "Z");
    expect(p.p0).toBeCloseTo(0.5, 12);
    expect(p.p1).toBeCloseTo(0.5, 12);
    const x = probabilities(plusState(), 0, "X");
    expect(x.p0).toBeCloseTo(1, 12);
  });

  it("measurement samples with the supplied uniform and projects", () => {
    const r0 = measure(plusState(), 0, "Z", () => 0.2);
    expect(r0.outcome).toBe(0);
    expect(probabilities(r0.rho, 0, "Z").p0).toBeCloseTo(1, 12);
    const r1 = measure(plusState(), 0, "Z", () => 0.9);
    expect(r1.outcome).toBe(1);
    expect(probabilities(r1.rho, 0, "Z").p1).toBeCloseTo(1, 12);
    // X-measurement of |+> is certain and calls no rng
    let calls = 0;
    const rx = measure(plusState(), 0, "X", () => {
      calls++;
      return 0.5;
    });
    expect(rx.outcome).toBe(0);
    expect(calls).toBe(0);
    expect(purity(rx.rho)).toBeCloseTo(1, 12);
  });

  it("measuring one half of a braided pair collapses the other", () => {
    const bell = braid(identityState(2), 2);
    const r = measure(bell, 0, "Z", () => 0.7); // outcome 1
    expect(r.outcome).toBe(1);
    expect(probabilities(r.rho, 1, "Z").p1).toBeCloseTo(1, 12);
  });

  it("reduced density of a braided pair is maximally mixed with entropy 1 bit", () => {
    const bell = braid(identityState(2), 2);
    const red = reducedDensity(bell, [1]);
    expect(red.re[0]).toBeCloseTo(0.5, 12);
    expect(red.re[3]).toBeCloseTo(0.5, 12);
    expect(Math.abs(red.re[1]) + Math.abs(red.im[1])).toBeLessThan(1e-12);
    expect(vonNeumannEntropy(red)).toBeCloseTo(1, 8);
    expect(vonNeumannEntropy(bell)).toBeCloseTo(0, 8);
  });

  it("expectation values match stabilisers of sigma_2|00>", () => {
    const bell = braid(identityState(2), 2);
    const E = (a: [number, number, number], b: [number, number, number]) =>
      expectationProduct(bell, [
        { qubit: 0, axis: a },
        { qubit: 1, axis: b },
      ]);
    expect(E([0, 0, 1], [0, 0, 1])).toBeCloseTo(1, 12); // ZZ
    expect(Math.abs(E([1, 0, 0], [1, 0, 0]))).toBeLessThan(1e-12); // XX
    expect(Math.abs(E([1, 0, 0], [0, 1, 0]))).toBeCloseTo(1, 12); // XY
    expect(Math.abs(E([0, 1, 0], [1, 0, 0]))).toBeCloseTo(1, 12); // YX
    expect(measureExpectation(identityState(1), 0, "Z")).toBeCloseTo(1, 12);
  });

  it("dephasing is linear and only touches the chosen qubit", () => {
    const bell = braid(identityState(2), 2);
    const d = dephase(bell, 1, 0.25);
    expect(purity(d)).toBeCloseTo((1 + 0.25) / 2, 12); // (1 + (1-2p)^2)/2
    expect(probabilities(d, 0, "Z").p0).toBeCloseTo(0.5, 12);
  });
});

describe("Bell test", () => {
  it("sigma_2 on |00> gives S_CHSH ~ 2.828 with the game settings", () => {
    const bell = braid(identityState(2), 2);
    const r = chsh(bell, 0, 1);
    expect(r.S).toBeCloseTo(2 * Math.SQRT2, 10);
    expect(r.S).toBeLessThanOrEqual(r.quantumBound + 1e-9);
  });

  it("a product state cannot beat the classical bound", () => {
    expect(chsh(identityState(2), 0, 1).S).toBeLessThanOrEqual(2 + 1e-12);
    const dephased = dephase(braid(identityState(2), 2), 0, 0.5);
    expect(chsh(dephased, 0, 1).S).toBeLessThanOrEqual(2 + 1e-12);
  });

  it("mutual information of sigma_2|00> is 2 bits, of |00> is 0", () => {
    const bell = braid(identityState(2), 2);
    expect(mutualInformation(bell, [0], [1])).toBeCloseTo(2, 8);
    expect(mutualInformation(identityState(2), [0], [1])).toBeCloseTo(0, 8);
    // across a cut in a 4-qubit state where only sigma_4 crosses it
    const four = braid(identityState(4), 4);
    expect(mutualInformation(four, [0, 1], [2, 3])).toBeCloseTo(2, 8);
  });
});

describe("QASM export", () => {
  it("matches the fixture for sigma_2 on |00>", () => {
    const fixture = [
      "OPENQASM 3;",
      'include "stdgates.inc";',
      "qubit[2] q;",
      "bit[2] c;",
      "h q[0];",
      "h q[1];",
      "cx q[0], q[1];",
      "rz(pi/2) q[1];",
      "cx q[0], q[1];",
      "h q[0];",
      "h q[1];",
      "",
    ].join("\n");
    expect(exportQasm(2, [{ type: "braid", k: 2, inverse: false }])).toBe(fixture);
  });

  it("exports internal crossings, inverses and asks", () => {
    const q = exportQasm(2, [
      { type: "braid", k: 1, inverse: false },
      { type: "braid", k: 3, inverse: true },
      { type: "ask", qubit: 0, basis: "Z" },
      { type: "ask", qubit: 1, basis: "X" },
    ]);
    expect(q).toContain("rz(pi/2) q[0];");
    expect(q).toContain("rz(-pi/2) q[1];");
    expect(q).toContain("measure q[0] -> c[0];");
    expect(q).toContain("h q[1];\nmeasure q[1] -> c[1];");
  });
});

describe("rng pool", () => {
  it("turns bytes into uniforms 32 bits at a time", () => {
    const u = uniformsFromBytes(new Uint8Array([0, 0, 0, 0, 0x80, 0, 0, 0, 0xff, 0xff, 0xff, 0xff, 1]));
    expect(u).toHaveLength(3);
    expect(u[0]).toBe(0);
    expect(u[1]).toBeCloseTo(0.5, 12);
    expect(u[2]).toBeLessThan(1);
  });

  it("derives one uniform from a binomial count", () => {
    expect(uniformFromBinomialCount(512, 1024)).toBeCloseTo(0.5, 2);
    expect(uniformFromBinomialCount(515, 1024)).toBeGreaterThan(0.55);
    expect(uniformFromBinomialCount(515, 1024)).toBeLessThan(0.6);
    expect(uniformFromBinomialCount(0, 10)).toBeGreaterThan(0);
    expect(uniformFromBinomialCount(10, 10)).toBeLessThan(1);
  });

  it("consumes the pool in order then falls back honestly", () => {
    const pool = buildPool(
      { source: "moth", engine: "comet-qrng-v1", jobId: "j1", bytesHex: "00000000ffffffff" },
      { source: "moth", engine: "coin-toss-v1", jobId: "j2", heads: 515, shots: 1024 },
    );
    expect(pool.map((p) => p.source)).toEqual(["moth-qrng", "moth-qrng", "moth-cointoss"]);
    const rng = new BornRng(pool);
    expect(rng.source()).toBe("moth-qrng");
    expect(rng.remaining()).toBe(3);
    rng.next();
    rng.next();
    expect(rng.source()).toBe("moth-cointoss");
    const d = rng.next();
    expect(d.source).toBe("moth-cointoss");
    expect(rng.source()).toBe("classical-fallback");
    const f = rng.next();
    expect(f.source).toBe("classical-fallback");
    expect(f.u).toBeGreaterThanOrEqual(0);
    expect(f.u).toBeLessThan(1);
  });

  it("ignores placeholder files", () => {
    expect(buildPool({ source: "placeholder", bytesHex: "" }, { source: "placeholder", bits: "" })).toEqual([]);
  });
});
