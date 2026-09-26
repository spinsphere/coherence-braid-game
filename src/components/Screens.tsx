"use client";
import { BraidMark } from "./svg/BraidMark";
import { EntitySilhouette } from "./svg/EntitySilhouette";
import { PITCH, ABOUT } from "@/content/about";
import { CODEX, CODEX_DISCLAIMER, CODEX_ORDER } from "@/content/codex";
import { LEVELS } from "@/levels/levels";
import type { Progress } from "@/lib/storage";
import { ENTROPY, COINTOSS, mothBellS } from "@/lib/moth";
import { CertificateBody } from "./modals/Certificate";
import type { EntityId } from "@/game/contact";
import { useState } from "react";

const Nav = ({ onBack, title }: { onBack: () => void; title: string }) => (
  <div className="flex items-center gap-3 mb-4">
    <button onClick={onBack} className="text-sm text-muted hover:text-ink">
      ← back
    </button>
    <h1 className="text-xl font-semibold">{title}</h1>
  </div>
);

export function TitleScreen({ onPlay, onLevels, onCodex, onAbout, quantumLeft, source }: { onPlay: () => void; onLevels: () => void; onCodex: () => void; onAbout: () => void; quantumLeft: number; source: string }) {
  const s = mothBellS();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <BraidMark size={72} />
      <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">
        COHERENCE<span className="text-muted">:</span> Braid
      </h1>
      <p className="text-muted mt-1 text-sm">a civilization in superposition · Global Quantum Game Jam 2026</p>
      <p className="max-w-2xl mt-6 text-sm sm:text-base leading-relaxed text-ink/90">{PITCH}</p>
      <div className="mt-8 flex flex-wrap gap-2 justify-center">
        <button onClick={onPlay} className="px-6 py-3 rounded-lg bg-accent text-bg font-semibold text-base hover:brightness-110">
          Play
        </button>
        <button onClick={onLevels} className="px-5 py-3 rounded-lg border border-line hover:border-accent">
          Levels
        </button>
        <button onClick={onCodex} className="px-5 py-3 rounded-lg border border-line hover:border-accent">
          Codex
        </button>
        <button onClick={onAbout} className="px-5 py-3 rounded-lg border border-line hover:border-accent">
          About the physics
        </button>
      </div>
      <p className="mt-10 text-[11px] text-muted max-w-xl leading-relaxed">
        Randomness enters in one place: the Born rule. This build carries {quantumLeft} quantum outcome{quantumLeft === 1 ? "" : "s"} from Moth Quantum (next draw: <span className="mono">{source}</span>)
        {s !== null ? `, and a CHSH witness of S = ${s.toFixed(3)} from its comet-qrng-v1 job` : ""}. After that it says so and uses classical randomness.
      </p>
    </main>
  );
}

export function LevelSelect({ progress, onBack, onStart, onUnlockAll }: { progress: Progress; onBack: () => void; onStart: (id: string) => void; onUnlockAll: () => void }) {
  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      <Nav onBack={onBack} title="Levels" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {LEVELS.map((l) => {
          const unlocked = l.index <= progress.unlocked;
          const done = progress.completed.includes(l.id);
          const myth = progress.mythemes[l.id]?.length ?? 0;
          return (
            <button
              key={l.id}
              disabled={!unlocked}
              onClick={() => onStart(l.id)}
              className={`text-left rounded-xl border p-4 ${unlocked ? "border-line hover:border-accent bg-panel" : "border-line/40 bg-bg-2"}`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-wide text-muted">Level {l.index}</span>
                <span className="text-[11px] text-muted">{done ? "won" : unlocked ? "open" : "locked"}</span>
              </div>
              <div className="text-lg font-semibold mt-0.5">{l.title}</div>
              <div className="text-xs text-muted">{l.subtitle}</div>
              <div className="text-xs mt-2 text-ink/80">
                {l.n} cohorts · {l.allowedActions.join(" · ").toLowerCase()}
                {l.contact ? " · contact" : ""}
              </div>
              {myth > 0 && <div className="text-[11px] text-accent mt-1">carries {myth} myth{myth > 1 ? "s" : ""} from earlier collapses</div>}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted mt-5">
        Levels unlock in order. Judges and the impatient may{" "}
        <button onClick={onUnlockAll} className="underline hover:text-ink">
          open every level
        </button>
        .
      </p>
    </main>
  );
}

export function CodexScreen({ progress, onBack }: { progress: Progress; onBack: () => void }) {
  const [open, setOpen] = useState<EntityId | null>(null);
  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      <Nav onBack={onBack} title="Codex · contact as a mirror" />
      <p className="text-sm text-muted">{CODEX_DISCLAIMER}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        {CODEX_ORDER.map((id) => {
          const met = progress.codex.includes(id);
          const e = CODEX[id];
          return (
            <button key={id} onClick={() => setOpen(id)} className={`rounded-xl border p-3 text-left ${met ? "border-line bg-panel hover:border-accent" : "border-line/40 bg-bg-2 opacity-70 hover:opacity-100"}`}>
              <div className="flex justify-center">
                <EntitySilhouette id={id} size={96} />
              </div>
              <div className="text-sm font-medium mt-1">{e.name}</div>
              <div className="text-[11px] text-muted">{met ? e.tagline : "not yet met"}</div>
            </button>
          );
        })}
      </div>
      {open && (
        <div className="mt-5 rounded-xl border border-line bg-panel p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <EntitySilhouette id={open} size={140} />
            <div>
              <h2 className="text-lg font-semibold">{CODEX[open].name}</h2>
              <p className="italic text-muted text-sm">{CODEX[open].tagline}</p>
              <p className="text-sm mt-2 leading-relaxed">{CODEX[open].entry}</p>
              <p className="text-xs text-accent mt-2">{CODEX[open].lookedFor}</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      <Nav onBack={onBack} title="About the physics" />
      <div className="flex flex-col gap-5">
        {ABOUT.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-ink/90 mt-2">
                {p}
              </p>
            ))}
          </section>
        ))}
        <section>
          <h2 className="text-lg font-semibold">The certificate in this build</h2>
          <div className="mt-2">
            <CertificateBody />
          </div>
        </section>
        <section>
          <h2 className="text-lg font-semibold">Credits</h2>
          <ul className="text-sm leading-relaxed text-ink/90 mt-2 list-disc pl-5">
            <li>
              Moth Quantum: engines {ENTROPY.source === "moth" ? `comet-qrng-v1 (job ${ENTROPY.jobId})` : ""}
              {COINTOSS.source === "moth" ? `, coin-toss-v1 (job ${COINTOSS.jobId})` : ""}, labyrinth-v1 (see provenance.json).
            </li>
            <li>Busemeyer and Bruza, Quantum Models of Cognition and Decision: order effects, incompatibility, interference.</li>
            <li>Trnka and Lorencová, Quantum Anthropology: coherence, inner dynamics and mythemes, used here as analogy.</li>
            <li>The Ising-anyon (Majorana) braid representation from topological quantum computing.</li>
            <li>Everything on screen is procedural SVG and CSS. No engine, no fonts fetched, no likenesses.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
