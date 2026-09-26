// Optional, Vercel only: submit a fresh comet-qrng-v1 job server-side and
// return the same JSON shape as public/moth/entropy.json (minus raw counts).
// The key never reaches the browser. Guarded by a 60 s rate limit and a hard
// cap of 3 calls per process lifetime so a public link cannot drain credits.
// The static export (STATIC_EXPORT=1) excludes this file through
// next.config.ts pageExtensions, so it never breaks `next build` for itch.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = "https://api.mothquantum.com";
const WINDOW_MS = 60_000;
const MAX_CALLS = 3;
let calls = 0;
let lastCall = 0;

async function moth(path: string, key: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { ok: res.ok, status: res.status, json, text };
}

export async function GET() {
  const key = process.env.MOTH_API_KEY;
  if (!key) return NextResponse.json({ error: "MOTH_API_KEY is not configured on the server." }, { status: 503 });
  const now = Date.now();
  if (calls >= MAX_CALLS) return NextResponse.json({ error: "This deployment has used its allowance of fresh seeds." }, { status: 429 });
  if (now - lastCall < WINDOW_MS) return NextResponse.json({ error: "One fresh seed per minute. Try again shortly." }, { status: 429 });
  calls++;
  lastCall = now;

  const sub = await moth("/api/v1/engines/comet-qrng-v1/process", key, {
    mode: "emu",
    params: { num_qubits: 12, shots: 4096, output_bytes: 512, bell_witness: true, include_raw_counts: false },
  });
  if (!sub.ok) return NextResponse.json({ error: `Moth refused the job (HTTP ${sub.status}).` }, { status: 502 });
  const jobId = String(sub.json.job_id);
  const t0 = Date.now();
  while (Date.now() - t0 < 45_000) {
    const st = await moth(`/api/v1/jobs/${jobId}/status`, key);
    const s = String(st.json.status ?? "").toLowerCase();
    if (/^(completed|succeeded|done|finished)$/.test(s)) break;
    if (/^(failed|error|cancelled|canceled)$/.test(s)) return NextResponse.json({ error: `Moth job ${jobId} ${s}.`, jobId }, { status: 502 });
    await new Promise((r) => setTimeout(r, 1500));
  }
  const res = await moth(`/api/v1/jobs/${jobId}/result`, key);
  if (!res.ok) return NextResponse.json({ error: `Result not ready for job ${jobId}.`, jobId }, { status: 504 });
  const result = (res.json.result ?? {}) as Record<string, unknown>;
  const out = (result.output && typeof result.output === "object" ? result.output : result) as Record<string, unknown>;
  const random = (out.random ?? {}) as { hex?: string };
  const bytesHex = random.hex ?? "";
  return NextResponse.json({
    source: "moth",
    engine: "comet-qrng-v1",
    jobId,
    mode: "emu",
    backend: (out.provenance as { backend?: string } | undefined)?.backend ?? null,
    createdAt: new Date().toISOString(),
    bytesHex,
    byteCount: bytesHex.length / 2,
    bell: out.bell_witness ?? null,
    certificate: out.certificate ?? out.entropy_report ?? null,
    entropyReport: out.entropy ?? null,
    extractor: out.extractor ?? null,
    commitment: out.commitment ?? null,
    pulse: out.pulse ?? null,
    provenance: out.provenance ?? null,
  });
}
