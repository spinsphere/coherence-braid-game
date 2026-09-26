// Eigenvalues of a Hermitian matrix via cyclic Jacobi on its real symmetric
// embedding [[A, -B], [B, A]] (each eigenvalue appears twice). Fine for the
// <= 32 x 32 matrices this game produces.

export function symmetricEigenvalues(a: Float64Array, n: number, maxSweeps = 60): number[] {
  const m = new Float64Array(a);
  const at = (r: number, c: number) => m[r * n + c];
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let r = 0; r < n; r++) for (let c = r + 1; c < n; c++) off += at(r, c) * at(r, c);
    if (off < 1e-22) break;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = at(p, q);
        if (Math.abs(apq) < 1e-300) continue;
        const app = at(p, p);
        const aqq = at(q, q);
        const theta = (aqq - app) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = m[k * n + p];
          const akq = m[k * n + q];
          m[k * n + p] = c * akp - s * akq;
          m[k * n + q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = m[p * n + k];
          const aqk = m[q * n + k];
          m[p * n + k] = c * apk - s * aqk;
          m[q * n + k] = s * apk + c * aqk;
        }
      }
    }
  }
  const ev: number[] = [];
  for (let i = 0; i < n; i++) ev.push(m[i * n + i]);
  return ev.sort((x, y) => x - y);
}

/** Eigenvalues of the Hermitian matrix (re + i im), dim x dim, ascending. */
export function hermitianEigenvalues(re: Float64Array, im: Float64Array, dim: number): number[] {
  const n2 = 2 * dim;
  const big = new Float64Array(n2 * n2);
  for (let r = 0; r < dim; r++)
    for (let c = 0; c < dim; c++) {
      const a = re[r * dim + c];
      const b = im[r * dim + c];
      big[r * n2 + c] = a;
      big[(r + dim) * n2 + (c + dim)] = a;
      big[r * n2 + (c + dim)] = -b;
      big[(r + dim) * n2 + c] = b;
    }
  const all = symmetricEigenvalues(big, n2);
  // pairs: take every other after sorting
  const out: number[] = [];
  for (let i = 0; i < all.length; i += 2) out.push((all[i] + all[i + 1]) / 2);
  return out;
}
