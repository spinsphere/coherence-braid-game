#!/usr/bin/env node
// Bake Moth Quantum results into public/moth/ so the static itch.io build
// ships with real Born-rule samples and their certificate.
//
// Plain Node (>= 18), no dependencies. Reads MOTH_API_KEY from the
// environment, or from .env.local if present. Never prints the key.
//
// Priority order (see scripts/moth-api-notes.md):
//   1. coin-toss-v1   (2 credits)  -> public/moth/cointoss.json
//   2. comet-qrng-v1  (5 credits)  -> public/moth/entropy.json
//   3. labyrinth-v1   (5 credits)  -> public/moth/labyrinth.json
// Stops as soon as a run is refused for credits. Completed jobs recorded in
// public/moth/provenance.json are re-downloaded, not re-run.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public", "moth");
const BASE = process.env.MOTH_BASE_URL || "https://api.mothquantum.com";

function loadEnvLocal() {
  const p = path.join(ROOT, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const KEY = process.env.MOTH_API_KEY;
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const DRY = process.argv.includes("--dry-run");

fs.mkdirSync(OUT, { recursive: true });

const provPath = path.join(OUT, "provenance.json");
const prov = fs.existsSync(provPath)
  ? JSON.parse(fs.readFileSync(provPath, "utf8"))
  : { bakedAt: null, baseUrl: BASE, jobs: {} };

function saveProv() {
  prov.bakedAt = new Date().toISOString();
  prov.baseUrl = BASE;
  fs.writeFileSync(provPath, JSON.stringify(prov, null, 2) + "\n");
}

function writeJson(name, obj) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
  console.log(`  wrote public/moth/${name} (${fs.statSync(p).size} bytes)`);
}

async function api(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, ok: res.ok, json, text };
}

class CreditsRefused extends Error {}

async function submit(engine, body) {
  const r = await api("POST", `/api/v1/engines/${engine}/process`, body);
  if (r.status === 402 || (r.status === 403 && /credit|balance|insufficient|quota/i.test(r.text))) {
    throw new CreditsRefused(`${engine}: refused for credits (HTTP ${r.status}): ${r.json?.detail || r.text.slice(0, 200)}`);
  }
  if (!r.ok) throw new Error(`${engine}: submit failed HTTP ${r.status}: ${r.text.slice(0, 500)}`);
  return r.json; // { job_id, status, submitted_at }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForJob(jobId, timeoutMs = 10 * 60 * 1000) {
  const t0 = Date.now();
  let last = "";
  while (Date.now() - t0 < timeoutMs) {
    const r = await api("GET", `/api/v1/jobs/${jobId}/status`);
    if (!r.ok) throw new Error(`status ${jobId} HTTP ${r.status}: ${r.text.slice(0, 300)}`);
    const s = String(r.json.status || "").toLowerCase();
    if (s !== last) {
      console.log(`  job ${jobId} status: ${s}`);
      last = s;
    }
    if (/^(completed|succeeded|success|done|finished)$/.test(s)) return r.json;
    if (/^(failed|error|errored|cancelled|canceled|timed_out)$/.test(s)) {
      throw new Error(`job ${jobId} ${s}: ${JSON.stringify(r.json.error || r.json).slice(0, 600)}`);
    }
    await sleep(2000);
  }
  throw new Error(`job ${jobId} timed out`);
}

async function fetchResult(jobId) {
  const r = await api("GET", `/api/v1/jobs/${jobId}/result`);
  if (!r.ok) throw new Error(`result ${jobId} HTTP ${r.status}: ${r.text.slice(0, 300)}`);
  if (r.json.result !== undefined && r.json.result !== null) return r.json.result;
  // Some engines materialise a file output instead of an inline result.
  const outs = r.json.outputs || [];
  for (const o of outs) {
    const url = o.url || o.download_url || o.presigned_url;
    if (!url) continue;
    const res = await fetch(url);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw_text: text };
    }
  }
  throw new Error(`result ${jobId}: no inline result and no downloadable output`);
}

// Run an engine, or re-download a completed job recorded in provenance.
async function runOrReuse(key, engine, body, creditsPerRun) {
  const rec = prov.jobs[key];
  if (rec && rec.jobId && rec.status === "completed") {
    console.log(`${engine}: reusing completed job ${rec.jobId} (no credits spent)`);
    const result = await fetchResult(rec.jobId);
    return { jobId: rec.jobId, submittedAt: rec.submittedAt, result, reused: true };
  }
  if (DRY) {
    console.log(`${engine}: DRY RUN, would submit ${JSON.stringify(body)}`);
    return null;
  }
  console.log(`${engine}: submitting (${creditsPerRun} credits) ${JSON.stringify(body)}`);
  const sub = await submit(engine, body);
  prov.jobs[key] = {
    engine,
    jobId: sub.job_id,
    status: "submitted",
    submittedAt: sub.submitted_at,
    creditsPerRun,
    request: body,
  };
  saveProv();
  const st = await waitForJob(sub.job_id);
  prov.jobs[key].status = "completed";
  prov.jobs[key].completedAt = st.updated_at;
  saveProv();
  const result = await fetchResult(sub.job_id);
  return { jobId: sub.job_id, submittedAt: sub.submitted_at, result, reused: false };
}

function placeholder(name, extra) {
  return { source: "placeholder", note: "Moth Quantum result not baked for this build. The game falls back to classical randomness and says so on screen.", ...extra };
}

async function main() {
  if (!KEY) {
    console.error("MOTH_API_KEY is not set (put it in .env.local). Writing placeholders only.");
    if (!fs.existsSync(path.join(OUT, "cointoss.json"))) writeJson("cointoss.json", placeholder("cointoss", { engine: "coin-toss-v1", bits: "", shots: 0, heads: 0, tails: 0 }));
    if (!fs.existsSync(path.join(OUT, "entropy.json"))) writeJson("entropy.json", placeholder("entropy", { engine: "comet-qrng-v1", bytesHex: "", bell: null, certificate: null }));
    process.exit(0);
  }

  // 1. Catalog: print credits before spending anything.
  const cat = await api("GET", "/api/v1/engines");
  if (!cat.ok) throw new Error(`catalog HTTP ${cat.status}: ${cat.text.slice(0, 300)}`);
  const engines = Object.fromEntries(cat.json.engines.map((e) => [e.engine_id, e]));
  const wanted = ["coin-toss-v1", "comet-qrng-v1", "labyrinth-v1"];
  console.log("Engine catalog (credits per run):");
  for (const id of wanted) {
    const e = engines[id];
    console.log(`  ${id.padEnd(16)} ${e ? e.credits_per_run : "MISSING"}  ${e ? e.name : ""}`);
    if (!e) throw new Error(`engine ${id} not in catalog`);
  }
  prov.catalog = Object.fromEntries(wanted.map((id) => [id, { name: engines[id].name, version: engines[id].version || null, credits_per_run: engines[id].credits_per_run, updated_at: engines[id].updated_at }]));
  saveProv();

  const want = (k) => ONLY.length === 0 || ONLY.includes(k);

  try {
    // 2. Coin Toss (2 credits). Counts only; see notes.
    if (want("cointoss")) {
      const shots = 1024;
      const r = await runOrReuse("cointoss", "coin-toss-v1", { mode: "emu", params: { shots } }, engines["coin-toss-v1"].credits_per_run);
      if (r) {
        const res = r.result || {};
        const heads = Number(res.heads ?? 0);
        const tails = Number(res.tails ?? 0);
        writeJson("cointoss.json", {
          source: "moth",
          engine: "coin-toss-v1",
          engineVersion: engines["coin-toss-v1"].version || null,
          jobId: r.jobId,
          mode: "emu",
          backend: res.backend || res.backend_name || "aer-emulator",
          createdAt: r.submittedAt || new Date().toISOString(),
          shots: Number(res.shots ?? shots),
          heads,
          tails,
          output: res.output ?? null,
          // The engine returns counts only, not the per-shot sequence, so
          // there is no bit string to store. The runtime derives one uniform
          // sample from the heads count (see src/sim/rng.ts).
          bits: typeof res.bits === "string" ? res.bits : "",
          note: "coin-toss-v1 returns heads/tails counts, not a per-shot bit sequence.",
          raw: res,
        });
      }
    }

    // 3. Comet QRNG (5 credits).
    if (want("entropy")) {
      const body = {
        mode: "emu",
        params: {
          num_qubits: 12,
          shots: 10000,
          output_bytes: 8192,
          bell_witness: true,
          include_raw_counts: true,
          epsilon_log2: 64,
        },
      };
      const r = await runOrReuse("entropy", "comet-qrng-v1", body, engines["comet-qrng-v1"].credits_per_run);
      if (r) {
        const res = r.result || {};
        const out = res.output && typeof res.output === "object" ? res.output : res;
        const bytesHex = out.random?.hex || "";
        // The raw counts (~10k bitstrings) are kept for auditors in a separate
        // file so the file the game loads at runtime stays small.
        const slim = JSON.parse(JSON.stringify(out));
        if (slim.raw && slim.raw.counts) {
          writeJson("entropy-raw-counts.json", { jobId: r.jobId, engine: "comet-qrng-v1", counts_sha256: slim.raw.counts_sha256 ?? null, counts: slim.raw.counts });
          slim.raw.counts = `see entropy-raw-counts.json (sha256 ${slim.raw.counts_sha256})`;
        }
        writeJson("entropy.json", {
          source: "moth",
          engine: "comet-qrng-v1",
          engineVersion: engines["comet-qrng-v1"].version || null,
          jobId: r.jobId,
          mode: out.provenance?.mode || "emu",
          backend: out.provenance?.backend || null,
          createdAt: r.submittedAt || new Date().toISOString(),
          bytesHex,
          byteCount: bytesHex.length / 2,
          bell: out.bell_witness ?? null,
          // The engine calls its certificate `entropy_report` (grade, budget
          // bits, output bits, statements). `certificate` is kept as the
          // game-facing name.
          certificate: out.certificate ?? out.entropy_report ?? null,
          extractor: out.extractor ?? null,
          entropyReport: out.entropy ?? null,
          commitment: out.commitment ?? null,
          pulse: out.pulse ?? null,
          provenance: out.provenance ?? null,
          deviceFingerprint: out.device_fingerprint ?? null,
          derived: out.random?.derived ?? null,
          rawCountsSha256: out.raw?.counts_sha256 ?? null,
          rawCountsIncluded: Boolean(out.raw?.counts),
          raw: slim,
        });
      }
    }

    // 4. Labyrinth (5 credits): five rooms in a row, one wall (between 2 and 3).
    if (want("labyrinth")) {
      const body = {
        mode: "emu",
        params: {
          level_data: {
            name: "coherence-deep-time",
            grid_size: { rows: 1, cols: 5 },
            num_qubits: 5,
            coupling_map: [[0, 1], [1, 2], [3, 4]],
          },
          shots: 4096,
          k: 2,
        },
      };
      const r = await runOrReuse("labyrinth", "labyrinth-v1", body, engines["labyrinth-v1"].credits_per_run);
      if (r) {
        const res = r.result || {};
        const out = res.output && typeof res.output === "object" ? res.output : res;
        writeJson("labyrinth.json", {
          source: "moth",
          engine: "labyrinth-v1",
          jobId: r.jobId,
          mode: "emu",
          createdAt: r.submittedAt || new Date().toISOString(),
          request: body.params.level_data,
          raw: out,
        });
      }
    }
  } catch (e) {
    if (e instanceof CreditsRefused) {
      console.error(`\nStopped: ${e.message}`);
      prov.stoppedFor = e.message;
      saveProv();
    } else {
      throw e;
    }
  }

  // Placeholders for anything not baked so the game still runs.
  if (!fs.existsSync(path.join(OUT, "cointoss.json"))) writeJson("cointoss.json", placeholder("cointoss", { engine: "coin-toss-v1", bits: "", shots: 0, heads: 0, tails: 0 }));
  if (!fs.existsSync(path.join(OUT, "entropy.json"))) writeJson("entropy.json", placeholder("entropy", { engine: "comet-qrng-v1", bytesHex: "", bell: null, certificate: null }));

  const spent = Object.values(prov.jobs).filter((j) => j.status === "completed").reduce((a, j) => a + (j.creditsPerRun || 0), 0);
  console.log(`\nDone. Credits attributable to completed jobs in provenance: ${spent}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
