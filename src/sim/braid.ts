// Ising-anyon / Majorana representation of the braid group on 2n strands
// acting on n qubits.
//   sigma_{2j-1} = exp(-i pi/4 Z_j)              (internal crossing: ritual)
//   sigma_{2j}   = exp(-i pi/4 X_j X_{j+1})      (external crossing: exchange)
//   sigma_k^{-1} = sigma_k^dagger
// Generators satisfy Yang-Baxter and far commutation; adjacent generators do
// not commute, which is the order-effect mechanic.

import { applyUnitary, dagger, gate, identityState, type Gate, type Rho, SQRT1_2 } from "./density";

export interface Crossing {
  k: number; // 1 .. 2n-1
  inverse: boolean;
}

const C = Math.cos(Math.PI / 4);
const S = Math.sin(Math.PI / 4);

/** diag(e^{-i pi/4}, e^{+i pi/4}) */
export const SIGMA_ODD: Gate = gate(1, [
  [C, -S],
  [0, 0],
  [0, 0],
  [C, S],
]);

/** cos(pi/4) I - i sin(pi/4) X (x) X */
export const SIGMA_EVEN: Gate = gate(2, [
  [C, 0], [0, 0], [0, 0], [0, -S],
  [0, 0], [C, 0], [0, -S], [0, 0],
  [0, 0], [0, -S], [C, 0], [0, 0],
  [0, -S], [0, 0], [0, 0], [C, 0],
]);

export function isInternal(k: number): boolean {
  return k % 2 === 1;
}

export function crossingCount(n: number): number {
  return 2 * n - 1;
}

/** Which qubits sigma_k touches (0-based). */
export function crossingTargets(k: number, n: number): number[] {
  if (k < 1 || k > 2 * n - 1) throw new Error(`sigma_${k} does not exist for n=${n}`);
  if (isInternal(k)) return [(k - 1) / 2];
  return [k / 2 - 1, k / 2];
}

export function sigmaGate(k: number, inverse: boolean): Gate {
  const g = isInternal(k) ? SIGMA_ODD : SIGMA_EVEN;
  return inverse ? dagger(g) : g;
}

export function braid(rho: Rho, k: number, inverse = false): Rho {
  return applyUnitary(rho, sigmaGate(k, inverse), crossingTargets(k, rho.n));
}

export function applyWord(rho: Rho, word: readonly Crossing[]): Rho {
  let r = rho;
  for (const c of word) r = braid(r, c.k, c.inverse);
  return r;
}

export function wordFromStart(n: number, word: readonly Crossing[]): Rho {
  return applyWord(identityState(n), word);
}

export function inverseWord(word: readonly Crossing[]): Crossing[] {
  return [...word].reverse().map((c) => ({ k: c.k, inverse: !c.inverse }));
}

const SUB = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
export function subscript(k: number): string {
  return String(k)
    .split("")
    .map((d) => SUB[Number(d)])
    .join("");
}

export function crossingLabel(c: Crossing): string {
  return `σ${subscript(c.k)}${c.inverse ? "⁻¹" : ""}`;
}

export function wordLabel(word: readonly Crossing[]): string {
  return word.map(crossingLabel).join(" ");
}

/** Parse "s2 s1' s3" / "σ₂ σ₁⁻¹" style words (used by level definitions and tests). */
export function parseWord(text: string): Crossing[] {
  const out: Crossing[] = [];
  for (const tok of text.trim().split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^(?:s|σ)([0-9₀-₉]+)(⁻¹|'|-1)?$/);
    if (!m) throw new Error(`bad crossing token: ${tok}`);
    const digits = m[1]
      .split("")
      .map((ch) => (SUB.indexOf(ch) >= 0 ? String(SUB.indexOf(ch)) : ch))
      .join("");
    out.push({ k: Number(digits), inverse: Boolean(m[2]) });
  }
  return out;
}
