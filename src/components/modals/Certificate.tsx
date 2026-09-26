"use client";
import { ENTROPY, COINTOSS, PROVENANCE } from "@/lib/moth";

function Section({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <details className="rounded-lg bg-bg-2 border border-line p-2" open={title === "Bell witness" || title === "Certificate"}>
      <summary className="text-sm cursor-pointer">{title}</summary>
      <pre className="mono text-[11px] mt-2 overflow-auto max-h-64 scroll-thin whitespace-pre-wrap break-words">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export function CertificateBody() {
  const placeholder = ENTROPY.source !== "moth";
  const jobs = PROVENANCE.jobs ?? {};
  return (
    <div className="flex flex-col gap-2">
      {placeholder ? (
        <p className="text-danger">No Moth result is baked into this build. The game is running on classical randomness and says so beside every answer.</p>
      ) : (
        <p className="text-xs text-muted">
          Fields shown verbatim from Moth&apos;s <span className="mono text-ink">{ENTROPY.engine}</span> job <span className="mono text-ink">{ENTROPY.jobId}</span> ({ENTROPY.mode}
          {ENTROPY.backend ? `, ${ENTROPY.backend}` : ""}, {ENTROPY.createdAt}). Extractable bytes returned: <span className="mono text-ink">{ENTROPY.byteCount ?? 0}</span>. On the emulator the extractor is honest about being a simulator baseline, so the certificate is what this build carries, not the bytes.
        </p>
      )}
      {!placeholder && (
        <>
          <Section title="Bell witness" value={ENTROPY.bell} />
          <Section title="Certificate" value={ENTROPY.certificate} />
          <Section title="Entropy report" value={ENTROPY.entropyReport} />
          <Section title="Extractor" value={ENTROPY.extractor} />
          <Section title="Commitment" value={ENTROPY.commitment} />
          <Section title="Pulse" value={ENTROPY.pulse} />
          <Section title="Provenance" value={ENTROPY.provenance} />
          <Section title="Device fingerprint" value={ENTROPY.deviceFingerprint} />
        </>
      )}
      <div className="rounded-lg bg-bg-2 border border-line p-2 text-xs">
        <div className="text-sm">Coin Toss</div>
        {COINTOSS.source === "moth" ? (
          <p className="text-muted mt-1">
            <span className="mono text-ink">{COINTOSS.engine}</span> job <span className="mono text-ink">{COINTOSS.jobId}</span>: {COINTOSS.heads} heads, {COINTOSS.tails} tails of {COINTOSS.shots} shots on {COINTOSS.backend ?? "the emulator"}. The engine returns counts, not the sequence, so this yields exactly one uniform sample for the pool.
          </p>
        ) : (
          <p className="text-muted mt-1">not baked</p>
        )}
      </div>
      <div className="rounded-lg bg-bg-2 border border-line p-2 text-xs">
        <div className="text-sm">Jobs in this build</div>
        <ul className="mt-1 text-muted">
          {Object.entries(jobs).map(([k, j]) => (
            <li key={k} className="mono">
              {j.engine} · {j.jobId} · {j.status} · {j.creditsPerRun ?? "?"} credits
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
