// Density-matrix simulator for n <= 5 qubits. Dependency-free.
//
// Conventions
// - Basis index i encodes qubit q in bit (n-1-q): qubit 0 is the leftmost
//   (most significant) bit, matching the qubit-0-leftmost bitstrings the
//   Moth engines report and the order the braid diagram is drawn in.
// - rho is stored as separate real and imaginary Float64Arrays, row-major,
//   entry (r, c) at index r * dim + c.
// - Every function returns a new matrix; inputs are never mutated.

export interface Rho {
  n: number;
  dim: number;
  re: Float64Array;
  im: Float64Array;
}

export interface Gate {
  k: number; // number of qubits the gate acts on (1 or 2)
  re: Float64Array; // (2^k)^2 row-major
  im: Float64Array;
}

export type Basis = "Z" | "X";
export type Vec3 = readonly [number, number, number];

export const SQRT1_2 = Math.SQRT1_2;

export function bitOf(index: number, qubit: number, n: number): number {
  return (index >> (n - 1 - qubit)) & 1;
}

export function identityState(n: number): Rho {
  if (n < 1 || n > 6) throw new Error(`identityState: n must be 1..6, got ${n}`);
  const dim = 1 << n;
  const re = new Float64Array(dim * dim);
  const im = new Float64Array(dim * dim);
  re[0] = 1;
  return { n, dim, re, im };
}

export function cloneRho(rho: Rho): Rho {
  return { n: rho.n, dim: rho.dim, re: new Float64Array(rho.re), im: new Float64Array(rho.im) };
}

export function fromStateVector(n: number, re: ArrayLike<number>, im: ArrayLike<number>): Rho {
  const dim = 1 << n;
  const r = new Float64Array(dim * dim);
  const i = new Float64Array(dim * dim);
  for (let a = 0; a < dim; a++) {
    for (let b = 0; b < dim; b++) {
      // psi_a * conj(psi_b)
      r[a * dim + b] = re[a] * re[b] + im[a] * im[b];
      i[a * dim + b] = im[a] * re[b] - re[a] * im[b];
    }
  }
  return { n, dim, re: r, im: i };
}

export function gate(k: number, entries: ReadonlyArray<readonly [number, number]>): Gate {
  const d = 1 << k;
  if (entries.length !== d * d) throw new Error("gate: wrong entry count");
  const re = new Float64Array(d * d);
  const im = new Float64Array(d * d);
  entries.forEach(([a, b], idx) => {
    re[idx] = a;
    im[idx] = b;
  });
  return { k, re, im };
}

export function dagger(g: Gate): Gate {
  const d = 1 << g.k;
  const re = new Float64Array(d * d);
  const im = new Float64Array(d * d);
  for (let r = 0; r < d; r++)
    for (let c = 0; c < d; c++) {
      re[c * d + r] = g.re[r * d + c];
      im[c * d + r] = -g.im[r * d + c];
    }
  return { k: g.k, re, im };
}

export const H_GATE: Gate = gate(1, [
  [SQRT1_2, 0],
  [SQRT1_2, 0],
  [SQRT1_2, 0],
  [-SQRT1_2, 0],
]);

/** Unitary mapping the +1 / -1 eigenstates of (axis . sigma) onto |0> / |1>. */
export function axisToZGate(axis: Vec3): Gate {
  const [x, y, z] = normalize(axis);
  const theta = Math.acos(Math.max(-1, Math.min(1, z)));
  const phi = Math.atan2(y, x);
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  // U = [[c, e^{-i phi} s], [s, -e^{-i phi} c]]
  return gate(1, [
    [c, 0],
    [Math.cos(phi) * s, -Math.sin(phi) * s],
    [s, 0],
    [-Math.cos(phi) * c, Math.sin(phi) * c],
  ]);
}

function normalize(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  if (l === 0) throw new Error("zero axis");
  return [v[0] / l, v[1] / l, v[2] / l];
}

/**
 * rho' = U rho U^dagger with U acting on `targets` (targets[0] is the more
 * significant sub-index bit). Embeds by tensor indexing; never builds a
 * 2^n x 2^n matrix.
 */
export function applyUnitary(rho: Rho, U: Gate, targets: readonly number[]): Rho {
  const { n, dim } = rho;
  const k = U.k;
  if (targets.length !== k) throw new Error("applyUnitary: target count must match gate size");
  for (const t of targets) if (t < 0 || t >= n) throw new Error(`applyUnitary: qubit ${t} out of range`);
  const sub = 1 << k;
  // bit insertion: sub-index s -> mask over the full index
  const ins = new Int32Array(sub);
  let targetMask = 0;
  for (let m = 0; m < k; m++) targetMask |= 1 << (n - 1 - targets[m]);
  for (let s = 0; s < sub; s++) {
    let mask = 0;
    for (let m = 0; m < k; m++) if ((s >> (k - 1 - m)) & 1) mask |= 1 << (n - 1 - targets[m]);
    ins[s] = mask;
  }
  const bases: number[] = [];
  for (let i = 0; i < dim; i++) if ((i & targetMask) === 0) bases.push(i);

  // A = U rho (left multiply: mix rows)
  const aRe = new Float64Array(dim * dim);
  const aIm = new Float64Array(dim * dim);
  const vRe = new Float64Array(sub);
  const vIm = new Float64Array(sub);
  for (let c = 0; c < dim; c++) {
    for (const b of bases) {
      for (let s = 0; s < sub; s++) {
        const idx = (b | ins[s]) * dim + c;
        vRe[s] = rho.re[idx];
        vIm[s] = rho.im[idx];
      }
      for (let s2 = 0; s2 < sub; s2++) {
        let wr = 0;
        let wi = 0;
        for (let s = 0; s < sub; s++) {
          const ur = U.re[s2 * sub + s];
          const ui = U.im[s2 * sub + s];
          wr += ur * vRe[s] - ui * vIm[s];
          wi += ur * vIm[s] + ui * vRe[s];
        }
        const idx = (b | ins[s2]) * dim + c;
        aRe[idx] = wr;
        aIm[idx] = wi;
      }
    }
  }
  // rho' = A U^dagger (right multiply: mix columns). (A U†)[r,c] = sum_c' A[r,c'] conj(U[c,c'])
  const oRe = new Float64Array(dim * dim);
  const oIm = new Float64Array(dim * dim);
  for (let r = 0; r < dim; r++) {
    for (const b of bases) {
      for (let s = 0; s < sub; s++) {
        const idx = r * dim + (b | ins[s]);
        vRe[s] = aRe[idx];
        vIm[s] = aIm[idx];
      }
      for (let s2 = 0; s2 < sub; s2++) {
        let wr = 0;
        let wi = 0;
        for (let s = 0; s < sub; s++) {
          const ur = U.re[s2 * sub + s];
          const ui = -U.im[s2 * sub + s]; // conj
          wr += vRe[s] * ur - vIm[s] * ui;
          wi += vRe[s] * ui + vIm[s] * ur;
        }
        const idx = r * dim + (b | ins[s2]);
        oRe[idx] = wr;
        oIm[idx] = wi;
      }
    }
  }
  return { n, dim, re: oRe, im: oIm };
}

/** Probability of outcome 0 for a Z measurement of `qubit`. */
export function probZero(rho: Rho, qubit: number): number {
  let p = 0;
  for (let i = 0; i < rho.dim; i++) if (bitOf(i, qubit, rho.n) === 0) p += rho.re[i * rho.dim + i];
  return clamp01(p);
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export interface MeasureResult {
  outcome: 0 | 1;
  p0: number;
  p1: number;
  rho: Rho;
}

/** Projective Z measurement with the outcome already chosen (used by measure). */
export function projectZ(rho: Rho, qubit: number, outcome: 0 | 1): Rho {
  const { n, dim } = rho;
  const p = outcome === 0 ? probZero(rho, qubit) : 1 - probZero(rho, qubit);
  if (p <= 1e-12) throw new Error("projectZ: outcome has zero probability");
  const re = new Float64Array(dim * dim);
  const im = new Float64Array(dim * dim);
  for (let r = 0; r < dim; r++) {
    if (bitOf(r, qubit, n) !== outcome) continue;
    for (let c = 0; c < dim; c++) {
      if (bitOf(c, qubit, n) !== outcome) continue;
      re[r * dim + c] = rho.re[r * dim + c] / p;
      im[r * dim + c] = rho.im[r * dim + c] / p;
    }
  }
  return { n, dim, re, im };
}

/**
 * Measure `qubit` along `axis` (Z, X, or any Bloch vector). The only place
 * randomness enters the simulator: `rng()` supplies one uniform in [0,1).
 * Outcome 0 is the +1 eigenstate (|0>, |+>, ...), outcome 1 the -1 eigenstate.
 */
export function measureAxis(rho: Rho, qubit: number, axis: Vec3, rng: () => number): MeasureResult {
  const isZ = axis[0] === 0 && axis[1] === 0 && axis[2] > 0;
  const U = isZ ? null : axisToZGate(axis);
  const rotated = U ? applyUnitary(rho, U, [qubit]) : rho;
  const p0 = probZero(rotated, qubit);
  const p1 = clamp01(1 - p0);
  let outcome: 0 | 1;
  if (p0 >= 1 - 1e-12) outcome = 0;
  else if (p0 <= 1e-12) outcome = 1;
  else outcome = rng() < p0 ? 0 : 1;
  const projected = projectZ(rotated, qubit, outcome);
  const back = U ? applyUnitary(projected, dagger(U), [qubit]) : projected;
  return { outcome, p0, p1, rho: back };
}

export function basisAxis(basis: Basis): Vec3 {
  return basis === "Z" ? [0, 0, 1] : [1, 0, 0];
}

export function measure(rho: Rho, qubit: number, basis: Basis, rng: () => number): MeasureResult {
  return measureAxis(rho, qubit, basisAxis(basis), rng);
}

/** Outcome probabilities without measuring (the cloud). */
export function probabilities(rho: Rho, qubit: number, basis: Basis): { p0: number; p1: number } {
  const e = measureExpectation(rho, qubit, basisAxis(basis));
  const p0 = clamp01((1 + e) / 2);
  return { p0, p1: clamp01(1 - p0) };
}

/** Analytic <axis . sigma> on one qubit. */
export function measureExpectation(rho: Rho, qubit: number, axis: Vec3 | "X" | "Y" | "Z"): number {
  const v: Vec3 = axis === "X" ? [1, 0, 0] : axis === "Y" ? [0, 1, 0] : axis === "Z" ? [0, 0, 1] : axis;
  return expectationProduct(rho, [{ qubit, axis: v }]);
}

/** Tr(rho * prod_q (axis_q . sigma_q)); identity on all other qubits. */
export function expectationProduct(rho: Rho, ops: ReadonlyArray<{ qubit: number; axis: Vec3 }>): number {
  const { n, dim } = rho;
  const k = ops.length;
  const sub = 1 << k;
  // single-qubit operator M = x X + y Y + z Z = [[z, x - i y], [x + i y, -z]]
  const mRe = ops.map(({ axis: [x, , z] }) => [z, x, x, -z]);
  const mIm = ops.map(({ axis: [, y] }) => [0, -y, y, 0]);
  let total = 0;
  for (let i = 0; i < dim; i++) {
    for (let s = 0; s < sub; s++) {
      // j differs from i on the op qubits according to s (s bit m = new bit of ops[m].qubit)
      let j = i;
      let oRe = 1;
      let oIm = 0;
      for (let m = 0; m < k; m++) {
        const q = ops[m].qubit;
        const bi = bitOf(i, q, n);
        const bj = (s >> (k - 1 - m)) & 1;
        if (bj !== bi) j ^= 1 << (n - 1 - q);
        // O[j,i] = prod M[bj, bi]
        const er = mRe[m][bj * 2 + bi];
        const ei = mIm[m][bj * 2 + bi];
        const nr = oRe * er - oIm * ei;
        const ni = oRe * ei + oIm * er;
        oRe = nr;
        oIm = ni;
      }
      // Tr(rho O) = sum_{i,j} rho[i,j] O[j,i]
      const rr = rho.re[i * dim + j];
      const ri = rho.im[i * dim + j];
      total += rr * oRe - ri * oIm;
    }
  }
  return total;
}

/** (1-p) rho + p Z_q rho Z_q : off-diagonals in qubit q shrink by (1-2p). */
export function dephase(rho: Rho, qubit: number, p: number): Rho {
  const { n, dim } = rho;
  const f = 1 - 2 * p;
  const re = new Float64Array(rho.re);
  const im = new Float64Array(rho.im);
  for (let r = 0; r < dim; r++) {
    const br = bitOf(r, qubit, n);
    for (let c = 0; c < dim; c++) {
      if (bitOf(c, qubit, n) !== br) {
        re[r * dim + c] *= f;
        im[r * dim + c] *= f;
      }
    }
  }
  return { n, dim, re, im };
}

/** Tr(rho^2): the coherence stat. */
export function purity(rho: Rho): number {
  let s = 0;
  for (let i = 0; i < rho.re.length; i++) s += rho.re[i] * rho.re[i] + rho.im[i] * rho.im[i];
  return s;
}

/** Tr(rho sigma). For a pure target this is the fidelity |<target|psi>|^2. */
export function overlap(rho: Rho, sigma: Rho): number {
  if (rho.dim !== sigma.dim) throw new Error("overlap: dimension mismatch");
  let s = 0;
  for (let i = 0; i < rho.re.length; i++) s += rho.re[i] * sigma.re[i] + rho.im[i] * sigma.im[i];
  return s;
}

/** Partial trace keeping `keep` (ascending order recommended; keep[0] becomes the MSB). */
export function reducedDensity(rho: Rho, keep: readonly number[]): Rho {
  const { n, dim } = rho;
  const k = keep.length;
  const kdim = 1 << k;
  const rest: number[] = [];
  for (let q = 0; q < n; q++) if (!keep.includes(q)) rest.push(q);
  const rdim = 1 << rest.length;
  const re = new Float64Array(kdim * kdim);
  const im = new Float64Array(kdim * kdim);
  const full = (a: number, e: number) => {
    let idx = 0;
    for (let m = 0; m < k; m++) if ((a >> (k - 1 - m)) & 1) idx |= 1 << (n - 1 - keep[m]);
    for (let m = 0; m < rest.length; m++) if ((e >> (rest.length - 1 - m)) & 1) idx |= 1 << (n - 1 - rest[m]);
    return idx;
  };
  for (let a = 0; a < kdim; a++)
    for (let b = 0; b < kdim; b++) {
      let sr = 0;
      let si = 0;
      for (let e = 0; e < rdim; e++) {
        const idx = full(a, e) * dim + full(b, e);
        sr += rho.re[idx];
        si += rho.im[idx];
      }
      re[a * kdim + b] = sr;
      im[a * kdim + b] = si;
    }
  return { n: k, dim: kdim, re, im };
}

export function trace(rho: Rho): number {
  let t = 0;
  for (let i = 0; i < rho.dim; i++) t += rho.re[i * rho.dim + i];
  return t;
}

export function isHermitian(rho: Rho, tol = 1e-9): boolean {
  const { dim } = rho;
  for (let r = 0; r < dim; r++)
    for (let c = 0; c < dim; c++) {
      if (Math.abs(rho.re[r * dim + c] - rho.re[c * dim + r]) > tol) return false;
      if (Math.abs(rho.im[r * dim + c] + rho.im[c * dim + r]) > tol) return false;
    }
  return true;
}
