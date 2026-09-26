// Born-rule sampler. The pool is built once at load time from the baked Moth
// results: comet-qrng bytes first (32 bits -> one uniform), then the single
// sample the Coin Toss counts support. When the pool is empty the sampler
// switches to crypto.getRandomValues and says so.

export type RngSource = "moth-qrng" | "moth-cointoss" | "classical-fallback";

export interface PoolEntry {
  u: number;
  source: RngSource;
  detail: string;
}

export interface RngDraw extends PoolEntry {
  index: number;
}

export interface EntropyFile {
  source?: string;
  engine?: string;
  jobId?: string;
  mode?: string;
  backend?: string | null;
  bytesHex?: string;
}

export interface CoinTossFile {
  source?: string;
  engine?: string;
  jobId?: string;
  mode?: string;
  backend?: string;
  shots?: number;
  heads?: number;
  tails?: number;
  bits?: string;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = (hex || "").replace(/[^0-9a-fA-F]/g, "");
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(2 * i, 2 * i + 2), 16);
  return out;
}

/** Consecutive 32-bit words -> uniforms in [0,1). Leftover bytes are dropped. */
export function uniformsFromBytes(bytes: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i + 4 <= bytes.length; i += 4) {
    const w = ((bytes[i] << 24) >>> 0) + (bytes[i + 1] << 16) + (bytes[i + 2] << 8) + bytes[i + 3];
    out.push(w / 4294967296);
  }
  return out;
}

/** Bit string "0110..." -> uniforms, 32 bits each. */
export function uniformsFromBits(bits: string): number[] {
  const clean = (bits || "").replace(/[^01]/g, "");
  const out: number[] = [];
  for (let i = 0; i + 32 <= clean.length; i += 32) out.push(parseInt(clean.slice(i, i + 32), 2) / 4294967296);
  return out;
}

/** log C(n, k) without a gamma function. */
function logChoose(n: number, k: number): number {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i);
  return s;
}

/**
 * The Coin Toss engine returns counts only. A heads count H ~ Binomial(N, 1/2)
 * is one genuine Born-rule variate; its CDF midpoint F(H-1) + P(H)/2 is one
 * uniform in (0,1) with about log2(sqrt(N)) bits of resolution. Never more
 * than one sample is derived from one job.
 */
export function uniformFromBinomialCount(heads: number, shots: number): number {
  if (!(shots > 0) || heads < 0 || heads > shots) return NaN;
  const logHalf = -shots * Math.LN2;
  let cdf = 0;
  for (let k = 0; k < heads; k++) cdf += Math.exp(logChoose(shots, k) + logHalf);
  const pH = Math.exp(logChoose(shots, heads) + logHalf);
  const u = cdf + pH / 2;
  return Math.min(Math.max(u, 0), 1 - 1e-12);
}

export function buildPool(entropy: EntropyFile | null, cointoss: CoinTossFile | null): PoolEntry[] {
  const pool: PoolEntry[] = [];
  if (entropy && entropy.source === "moth" && entropy.bytesHex) {
    const detail = `${entropy.engine ?? "comet-qrng-v1"} (${entropy.mode ?? "emu"}${entropy.backend ? ", " + entropy.backend : ""}), job ${entropy.jobId ?? "?"}`;
    for (const u of uniformsFromBytes(hexToBytes(entropy.bytesHex))) pool.push({ u, source: "moth-qrng", detail });
  }
  if (cointoss && cointoss.source === "moth") {
    const detail = `${cointoss.engine ?? "coin-toss-v1"} (${cointoss.mode ?? "emu"}${cointoss.backend ? ", " + cointoss.backend : ""}), job ${cointoss.jobId ?? "?"}`;
    if (cointoss.bits) {
      for (const u of uniformsFromBits(cointoss.bits)) pool.push({ u, source: "moth-cointoss", detail });
    } else if (typeof cointoss.heads === "number" && typeof cointoss.shots === "number" && cointoss.shots > 0) {
      const u = uniformFromBinomialCount(cointoss.heads, cointoss.shots);
      if (Number.isFinite(u)) pool.push({ u, source: "moth-cointoss", detail: `${detail}: ${cointoss.heads} heads of ${cointoss.shots}` });
    }
  }
  return pool;
}

function classicalUniform(): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => void } }).crypto;
  if (c && typeof c.getRandomValues === "function") {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
}

export class BornRng {
  private pool: PoolEntry[];
  private cursor = 0;
  private draws = 0;
  public last: RngDraw | null = null;

  constructor(pool: PoolEntry[] = []) {
    this.pool = pool;
  }

  /** Where the next draw will come from. */
  source(): RngSource {
    return this.cursor < this.pool.length ? this.pool[this.cursor].source : "classical-fallback";
  }

  remaining(): number {
    return Math.max(0, this.pool.length - this.cursor);
  }

  /** Append fresh certified bytes (Vercel proxy route) ahead of whatever is left. */
  prepend(entries: PoolEntry[]): void {
    this.pool = [...this.pool.slice(0, this.cursor), ...entries, ...this.pool.slice(this.cursor)];
  }

  next(): RngDraw {
    let entry: PoolEntry;
    if (this.cursor < this.pool.length) {
      entry = this.pool[this.cursor++];
    } else {
      entry = { u: classicalUniform(), source: "classical-fallback", detail: "crypto.getRandomValues (the quantum pool for this build is used up)" };
    }
    this.last = { ...entry, index: this.draws++ };
    return this.last;
  }

  /** A `() => number` for the simulator that records what it used. */
  fn(): () => number {
    return () => this.next().u;
  }
}
