# Moth Quantum API — discovery notes

Discovered on 2026-09-26 by running the calls below with the project API key.
Nothing here was guessed: every parameter name comes from the live catalog or
the OpenAPI spec the platform serves.

## Discovery calls

```sh
curl -s -H "Authorization: Bearer $MOTH_API_KEY" https://api.mothquantum.com/api/v1/engines
curl -s https://api.mothquantum.com/openapi.json      # 200, full spec (also /openapi.yaml)
curl -s https://api.mothquantum.com/docs/openapi.json # 404
curl -s https://api.mothquantum.com/docs              # Scalar UI, loads /openapi.yaml
```

The docs page at `/docs` is a Scalar reference that reads `/openapi.yaml`,
so the spec is public and does not need a key. Engine detail
(`GET /api/v1/engines/{engineID}`) returns the full `params_schema` and a
long `description_md`.

## Account

`GET /api/v1/me` → `platform_role: "player"`, no organizations.
`GET /api/v1/me/storage` → 10 GiB total quota, 0 used.
There is **no credit-balance endpoint** (`/api/v1/me/credits` and
`/api/v1/credits` are 404). The only cost signal is `credits_per_run` on the
engine catalog, so the bake spends in priority order and stops on refusal.

## Shape (verified)

- `POST /api/v1/engines/{engineID}/process`
  body `{ "mode": "emu" | "qpu", "params": { ... }, "start_from"?, "stop_after"? }`
  → `202 { job_id, status, submitted_at }`.
  `mode` at the top level is equivalent to `params.mode`; set one, never both.
- `GET /api/v1/jobs/{jobID}/status`
  → `{ job_id, engine_id, status, submitted_at, updated_at, progress?, steps?, result?, outputs?, error?, warnings? }`
- `GET /api/v1/jobs/{jobID}/result`
  → `{ result?: <inline JSON>, outputs?: [{ ...presigned url }] }`;
  409 until the job completes, 410 when nothing is retrievable.
- `GET /api/v1/jobs` lists jobs. `GET /api/v1/jobs/{jobID}` full record.
- Errors are RFC 7807 `application/problem+json` (`{ title, status, detail, errors[] }`).

## Engines used by the game

| engine | credits/run | what it returns |
|---|---|---|
| `coin-toss-v1` (Coin Toss) | **2** | One qubit, Hadamard, measured `shots` times. Inline `result`: `{ output: "heads"\|"tails", heads, tails, shots }`. **Counts only — the per-shot bit sequence is not returned.** |
| `comet-qrng-v1` (Comet Quantum RNG) | **5** | `num_qubits` (≤ 12 on emu with the Bell witness, whole circuit ≤ 20) × `shots` (≤ 10 000) Born-rule bits, SP 800-90B min-entropy estimate, Toeplitz extractor, CHSH witness on 4 extra Bell pairs, commitment, pulse. `result.output`: `{ random: {hex, bytes, derived?}, certificate, entropy, bell_witness, device_fingerprint, provenance, commitment, pulse, raw }`. On `emu` the certificate says `certified: false, grade: "simulator-baseline"`. |
| `labyrinth-v1` (Quantum Labyrinth) | **5** | `level_data { grid_size {rows, cols}, num_qubits (= rows*cols), coupling_map [[a,b],...] }` plus `shots` (≤ 10 000), `fraction`, `k` (≤ 4). Listed adjacent pairs are corridors, unlisted adjacent pairs are walls. Returns a game JSON with per-room data and ZZ correlations. |

Cheapest engines in the catalog are the 0-credit demo/test engines
(`demo-callback-v1`, `test-engine-v1`, `tamagotchi-v1`), which are not
quantum randomness sources. Coin Toss is the cheapest *quantum* engine at 2.

## Consequences for the game

1. Coin Toss cannot supply a bit pool because it only returns counts. The
   bake stores the counts verbatim. The runtime derives exactly one uniform
   sample from the heads count (a Binomial(shots, ½) variate mapped through its
   own CDF), labelled `moth-cointoss`, and never more than that.
2. The primary pool is therefore the `comet-qrng-v1` conditioned bytes, if any
   came back. Their certificate is shown verbatim; on the emulator it is an
   uncertified simulator baseline and the game says so.
3. Anything beyond the pool falls back to `crypto.getRandomValues`, labelled
   `classical-fallback` on screen.

## Bake log

See `public/moth/provenance.json` for job ids, statuses and credit cost per
job. Re-running `node scripts/moth-bake.mjs` re-downloads completed jobs
instead of paying again.
