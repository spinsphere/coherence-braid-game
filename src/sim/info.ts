import { hermitianEigenvalues } from "./eigen";
import { expectationProduct, reducedDensity, type Rho, type Vec3 } from "./density";

/** von Neumann entropy in bits. */
export function vonNeumannEntropy(rho: Rho): number {
  const ev = hermitianEigenvalues(rho.re, rho.im, rho.dim);
  let s = 0;
  for (const l of ev) if (l > 1e-12) s -= l * Math.log2(l);
  return s;
}

/** I(A:B) = S(A) + S(B) - S(AB), in bits. */
export function mutualInformation(rho: Rho, A: readonly number[], B: readonly number[]): number {
  const ab = [...A, ...B].sort((x, y) => x - y);
  const sA = vonNeumannEntropy(reducedDensity(rho, [...A].sort((x, y) => x - y)));
  const sB = vonNeumannEntropy(reducedDensity(rho, [...B].sort((x, y) => x - y)));
  const sAB = vonNeumannEntropy(reducedDensity(rho, ab));
  return Math.max(0, sA + sB - sAB);
}

export interface ChshSettings {
  a: Vec3;
  aPrime: Vec3;
  b: Vec3;
  bPrime: Vec3;
}

/**
 * Braided worldlines conserve fermion parity, so every state the player can
 * reach has E(Z,X) = E(X,Z) = 0: a textbook Z/X CHSH test would read zero
 * forever. The settings below live in the X-Y plane, where the braid
 * correlations actually are; sigma_2 |00> reaches the Tsirelson bound with them.
 */
export const CHSH_DEFAULT: ChshSettings = {
  a: [1, 0, 0],
  aPrime: [0, 1, 0],
  b: [Math.SQRT1_2, Math.SQRT1_2, 0],
  bPrime: [Math.SQRT1_2, -Math.SQRT1_2, 0],
};

export interface ChshResult {
  S: number;
  E: { ab: number; abPrime: number; aPrimeB: number; aPrimeBPrime: number };
  settings: ChshSettings;
  classicalBound: number;
  quantumBound: number;
}

/** S = |E(a,b) - E(a,b') + E(a',b) + E(a',b')| */
export function chsh(rho: Rho, qubitA: number, qubitB: number, settings: ChshSettings = CHSH_DEFAULT): ChshResult {
  const E = (x: Vec3, y: Vec3) =>
    expectationProduct(rho, [
      { qubit: qubitA, axis: x },
      { qubit: qubitB, axis: y },
    ]);
  const ab = E(settings.a, settings.b);
  const abPrime = E(settings.a, settings.bPrime);
  const aPrimeB = E(settings.aPrime, settings.b);
  const aPrimeBPrime = E(settings.aPrime, settings.bPrime);
  const S = Math.abs(ab - abPrime + aPrimeB + aPrimeBPrime);
  return { S, E: { ab, abPrime, aPrimeB, aPrimeBPrime }, settings, classicalBound: 2, quantumBound: 2 * Math.SQRT2 };
}
