import { BornRng, buildPool, type CoinTossFile, type EntropyFile } from "@/sim";
import entropyJson from "../../public/moth/entropy.json";
import cointossJson from "../../public/moth/cointoss.json";
import provenanceJson from "../../public/moth/provenance.json";

export interface EntropyCertificate extends EntropyFile {
  engineVersion?: string | null;
  createdAt?: string;
  byteCount?: number;
  bell?: Record<string, unknown> | null;
  certificate?: Record<string, unknown> | null;
  entropyReport?: Record<string, unknown> | null;
  extractor?: Record<string, unknown> | null;
  commitment?: Record<string, unknown> | null;
  pulse?: Record<string, unknown> | null;
  provenance?: Record<string, unknown> | null;
  deviceFingerprint?: Record<string, unknown> | null;
  rawCountsSha256?: string | null;
}

export const ENTROPY = entropyJson as unknown as EntropyCertificate;
export const COINTOSS = cointossJson as unknown as CoinTossFile & { createdAt?: string; output?: string | null };
export const PROVENANCE = provenanceJson as unknown as { bakedAt?: string; jobs?: Record<string, { engine: string; jobId: string; status: string; creditsPerRun?: number }> };

/** One pool for the whole session: quantum outcomes count down across levels. */
let rngSingleton: BornRng | null = null;
export function sessionRng(): BornRng {
  if (!rngSingleton) rngSingleton = new BornRng(buildPool(ENTROPY, COINTOSS));
  return rngSingleton;
}

export function mothBellS(): number | null {
  const s = ENTROPY.bell && (ENTROPY.bell as { S?: number }).S;
  return typeof s === "number" ? s : null;
}

export function mothProxyUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_MOTH_PROXY_URL;
  return u && u.length > 0 ? u.replace(/\/$/, "") : null;
}

export function describeSource(source: string): string {
  switch (source) {
    case "moth-qrng":
      return "drawn from Born-rule bytes measured by Moth's comet-qrng-v1 engine";
    case "moth-cointoss":
      return "drawn from a qubit measured on Moth's coin-toss-v1 engine";
    default:
      return "drawn from classical randomness: the quantum pool for this build is used up; the certificate panel shows the hardware witness";
  }
}
