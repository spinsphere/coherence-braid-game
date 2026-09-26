// OpenQASM 3 export of a World-Line.
//   sigma_{2j-1}      -> rz(pi/2) q[j-1]            (global phase ignored)
//   sigma_{2j}        -> rxx(pi/2) on q[j-1], q[j]  spelled out with h/cx/rz
//   inverse           -> -pi/2
//   Z-ask on cohort j -> measure q[j-1] -> c[j-1]
//   X-ask on cohort j -> h q[j-1]; measure q[j-1] -> c[j-1]

import type { Basis } from "./density";
import { crossingTargets, isInternal } from "./braid";

export type QasmOp =
  | { type: "braid"; k: number; inverse: boolean }
  | { type: "ask"; qubit: number; basis: Basis }
  | { type: "comment"; text: string };

export function qasmHeader(n: number): string {
  return `OPENQASM 3;\ninclude "stdgates.inc";\nqubit[${n}] q;\nbit[${n}] c;`;
}

export function qasmForOp(op: QasmOp, n: number): string[] {
  if (op.type === "comment") return [`// ${op.text}`];
  if (op.type === "ask") {
    const q = op.qubit;
    return op.basis === "Z" ? [`measure q[${q}] -> c[${q}];`] : [`h q[${q}];`, `measure q[${q}] -> c[${q}];`];
  }
  const angle = op.inverse ? "-pi/2" : "pi/2";
  if (isInternal(op.k)) {
    const [q] = crossingTargets(op.k, n);
    return [`rz(${angle}) q[${q}];`];
  }
  const [a, b] = crossingTargets(op.k, n);
  return [
    `h q[${a}];`,
    `h q[${b}];`,
    `cx q[${a}], q[${b}];`,
    `rz(${angle}) q[${b}];`,
    `cx q[${a}], q[${b}];`,
    `h q[${a}];`,
    `h q[${b}];`,
  ];
}

export function exportQasm(n: number, ops: readonly QasmOp[]): string {
  const lines = [qasmHeader(n)];
  for (const op of ops) lines.push(...qasmForOp(op, n));
  return lines.join("\n") + "\n";
}
