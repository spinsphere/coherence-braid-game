"use client";
import type { BellReport, CloudSnapshot, GameState, OrderComparison } from "@/game/types";
import type { EntityId } from "@/game/contact";
import { currentPair } from "@/game/engine";
import { CODEX, CODEX_DISCLAIMER } from "@/content/codex";
import { EntitySilhouette } from "@/components/svg/EntitySilhouette";
import { CloudRow } from "@/components/Cloud";
import { QUESTION_PAIRS } from "@/game/questions";
import { Btn, Modal } from "@/components/Modal";
import { ENTROPY, COINTOSS, PROVENANCE, mothBellS } from "@/lib/moth";
import { crossingLabel, type Crossing } from "@/sim";
import { CertificateBody } from "./Certificate";

export function IntroModal({ state, onBegin }: { state: GameState; onBegin: () => void }) {
  return (
    <Modal kicker={`Level ${state.level.index} · ${state.level.subtitle}`} title={state.level.title} actions={<Btn primary onClick={onBegin}>Begin</Btn>}>
      <p>{state.level.intro}</p>
      <p className="mt-3 text-accent-2">{state.level.goalText}</p>
      {state.mythemes.length > 0 && (
        <p className="mt-3 text-muted text-xs">
          Only the myths survived. The braid begins with <span className="mono text-ink">{state.mythemes.map((m) => m.map(crossingLabel).join(" ")).join(" · ")}</span>.
        </p>
      )}
    </Modal>
  );
}

export function WinModal({ state, onNext, onLevels, hasNext }: { state: GameState; onNext: () => void; onLevels: () => void; hasNext: boolean }) {
  return (
    <Modal
      kicker="The level is won"
      title={state.level.title}
      actions={
        <>
          <Btn onClick={onLevels}>Levels</Btn>
          {hasNext && (
            <Btn primary onClick={onNext}>
              Next level
            </Btn>
          )}
        </>
      }
    >
      <p>{state.level.winText}</p>
      <p className="mt-3 text-xs text-muted">
        Seasons used: {state.season}. Coherence at the end: {Math.round(state.coherenceHistory[state.coherenceHistory.length - 1] * 100)}.
      </p>
    </Modal>
  );
}

export function CollapseModal({ state, mytheme, onRetry, onLevels }: { state: GameState; mytheme: Crossing[]; onRetry: () => void; onLevels: () => void }) {
  return (
    <Modal
      kicker="Final collapse"
      title="The civilization is no longer one thing"
      actions={
        <>
          <Btn onClick={onLevels}>Levels</Btn>
          <Btn primary onClick={onRetry}>
            Begin again with the myth
          </Btn>
        </>
      }
    >
      <p>{state.endReason}</p>
      <p className="mt-3">Only the myths survive. The last three crossings become a mytheme, and the next civilization will begin by braiding it.</p>
      <div className="mt-3 rounded-lg bg-bg-2 border border-line p-3 mono text-lg text-center text-accent">{mytheme.length ? mytheme.map(crossingLabel).join(" ") : "(no crossings to remember)"}</div>
    </Modal>
  );
}

export function FailedModal({ reason, onRetry, onLevels }: { reason: string; onRetry: () => void; onLevels: () => void }) {
  return (
    <Modal
      kicker="The level ended"
      title="Not this time"
      actions={
        <>
          <Btn onClick={onLevels}>Levels</Btn>
          <Btn primary onClick={onRetry}>
            Try again
          </Btn>
        </>
      }
    >
      <p>{reason}</p>
    </Modal>
  );
}

export function ContactModal({ entityId, reading, onClose }: { entityId: EntityId; reading: { zCount: number; xCount: number; dominant: "Z" | "X" | "balanced" }; onClose: () => void }) {
  const e = CODEX[entityId];
  return (
    <Modal kicker="Contact · the mirror" title={e.name} actions={<Btn primary onClick={onClose}>Continue</Btn>} wide>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="shrink-0 self-center">
          <EntitySilhouette id={entityId} size={150} />
        </div>
        <div>
          <p className="italic text-muted">{e.tagline}</p>
          <p className="mt-2">{e.entry}</p>
          <p className="mt-3 text-xs text-muted">
            How you looked: {reading.zCount} register asks, {reading.xCount} indefinite asks, {reading.dominant === "balanced" ? "no dominant basis" : `${reading.dominant} dominant`}. {e.lookedFor}
          </p>
          <p className="mt-2 text-accent">What you met is a function of how you looked.</p>
          <p className="mt-2 text-[11px] text-muted">{CODEX_DISCLAIMER} This entry has been added to your codex.</p>
        </div>
      </div>
    </Modal>
  );
}

export function OrderModal({ state, data, onClose }: { state: GameState; data: OrderComparison; onClose: () => void }) {
  const pair = QUESTION_PAIRS[currentPair(state)];
  const qOf = (id: string) => (pair.z.id === id ? pair.z : pair.x);
  const col = (title: string, rows: OrderComparison["actual"]) => (
    <div className="rounded-lg bg-bg-2 border border-line p-3 flex-1">
      <div className="text-[11px] uppercase tracking-wide text-muted">{title}</div>
      {rows.map((r, i) => {
        const q = qOf(r.questionId);
        return (
          <div key={i} className="mt-2">
            <div className="text-sm">
              {i + 1}. {q.label}
            </div>
            <div className="mono text-xs text-muted">
              {q.stances[0]} {r.p[0].toFixed(2)} · {q.stances[1]} {r.p[1].toFixed(2)}
            </div>
            <div className="text-xs">
              answered <span className="mono text-ink">{r.stance}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <Modal kicker="Order effect" title="The order you did not choose" actions={<Btn primary onClick={onClose}>Continue</Btn>} wide>
      <p>
        These are the distributions the {state.cohorts[data.cohort].name} faced in the order you asked, and the distributions they would have faced with the same answers in the other order.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-3">
        {col("Your order", data.actual)}
        {col("The other order", data.swapped)}
      </div>
      <p className="mt-3 text-accent">Same questions. Same people. Different order. Different civilization.</p>
    </Modal>
  );
}

export function CloudsModal({ state, data, onClose }: { state: GameState; data: CloudSnapshot[]; onClose: () => void }) {
  const pair = QUESTION_PAIRS[currentPair(state)];
  return (
    <Modal kicker="Non-commutation" title="Two orders, two civilizations" actions={<Btn primary onClick={onClose}>Continue</Btn>} wide>
      <p>The same two crossings in the two possible orders, from the same founding state. Look at the {pair.x.label.toLowerCase()} cloud of the Smiths.</p>
      <div className="flex flex-col gap-4 mt-3">
        {data.map((snap) => (
          <div key={snap.word} className="rounded-lg bg-bg-2 border border-line p-3">
            <div className="mono text-sm text-accent mb-2">{snap.label}</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <CloudRow compact title={pair.z.label} stances={pair.z.stances} cohorts={snap.cohorts.map((c) => ({ name: c.name, color: c.color, p: c.z }))} />
              <CloudRow compact title={pair.x.label} stances={pair.x.stances} cohorts={snap.cohorts.map((c) => ({ name: c.name, color: c.color, p: c.x }))} />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function BellModal({ state, data, onClose }: { state: GameState; data: BellReport; onClose: () => void }) {
  const moth = mothBellS();
  const cut = state.level.bell!;
  const bar = (label: string, v: number, color: string) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-40 text-muted">{label}</span>
      <div className="flex-1 h-2 rounded bg-line/60 relative overflow-visible">
        <div className="absolute top-0 h-2 rounded" style={{ width: `${(Math.min(v, 2.9) / 2.9) * 100}%`, background: color }} />
        <div className="absolute -top-1 h-4 w-px bg-ink/60" style={{ left: `${(2 / 2.9) * 100}%` }} title="classical bound 2" />
        <div className="absolute -top-1 h-4 w-px bg-accent-2" style={{ left: `${((2 * Math.SQRT2) / 2.9) * 100}%` }} title="quantum bound 2.828" />
      </div>
      <span className="mono w-14 text-right">{v.toFixed(3)}</span>
    </div>
  );
  return (
    <Modal kicker="The Bell test" title={data.won ? "Federation" : "No violation yet"} actions={<Btn primary onClick={onClose}>{data.won ? "Continue" : "Braid on"}</Btn>} wide>
      <p>
        CHSH between the {state.cohorts[cut.a].name} and the {state.cohorts[cut.b].name}. Settings: X and Y on one side, (X±Y)/√2 on the other. Classical bound 2, quantum bound 2√2 ≈ 2.828.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {bar("S, exact from ρ", data.S, data.S > 2 ? "#9af2b5" : "#f2c98a")}
        {bar(`S, ${data.shots} sampled shots`, data.sampledS, "#8ad3f2")}
        {moth !== null && bar("S, Moth witness (comet-qrng-v1)", moth, "#d1b0ff")}
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 mono text-xs text-muted">
        <div>E(a,b) {data.E.ab.toFixed(3)}</div>
        <div>E(a,b′) {data.E.abPrime.toFixed(3)}</div>
        <div>E(a′,b) {data.E.aPrimeB.toFixed(3)}</div>
        <div>E(a′,b′) {data.E.aPrimeBPrime.toFixed(3)}</div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Entanglement across the cut, I(A:B) = {data.mutualInformation.toFixed(3)} bits. The sampled shots were drawn from {data.sampledSource === "classical-fallback" ? "classical randomness (the quantum pool is used up)" : `the Moth pool (${data.sampledSource})`}; each shot is a fresh, identically prepared civilization, so the live state is untouched.
      </p>
      {data.won ? (
        <p className="mt-3 text-accent">No agreement made beforehand can produce this. Federation.</p>
      ) : (
        <p className="mt-3 text-muted">S ≤ 2 can be explained by answers agreed in advance. An alliance that passes needs an exchange across the cut, unbound from other braids, with the rituals done first.</p>
      )}
    </Modal>
  );
}

export function CertificateModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal kicker="Moth Quantum" title="Entropy certificate" actions={<Btn primary onClick={onClose}>Close</Btn>} wide>
      <CertificateBody />
    </Modal>
  );
}

export function QasmModal({ text, copied, onCopy, onClose }: { text: string; copied: boolean; onCopy: () => void; onClose: () => void }) {
  return (
    <Modal
      kicker="Eject your civilization"
      title="OpenQASM 3"
      actions={
        <>
          <Btn onClick={onCopy}>{copied ? "Copied" : "Copy"}</Btn>
          <Btn primary onClick={onClose}>
            Close
          </Btn>
        </>
      }
      wide
    >
      <p className="text-muted text-xs">Every crossing and every ask on the World-Line as a circuit. Internal crossings are rz(π/2), exchanges are rxx(π/2), asks are measurements.</p>
      <pre className="mono text-xs mt-2 p-3 rounded-lg bg-bg-2 border border-line overflow-auto max-h-80 scroll-thin">{text}</pre>
    </Modal>
  );
}

export function InfoModal({ title, kicker, body, onClose }: { title: string; kicker?: string; body: string; onClose: () => void }) {
  return (
    <Modal kicker={kicker} title={title} actions={<Btn primary onClick={onClose}>Continue</Btn>}>
      <p>{body}</p>
    </Modal>
  );
}

export { ENTROPY, COINTOSS, PROVENANCE };
