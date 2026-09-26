"use client";
import type { GameState } from "@/game/types";
import { cohortPurity, cohortPurityVisible, currentPair, DEPHASE_PER_SEASON, isHidden, worldLineText } from "@/game/engine";
import { CoherenceDial } from "./CoherenceDial";
import { ERAS } from "@/content/eras";
import { QUESTION_PAIRS } from "@/game/questions";
import type { RngSource } from "@/sim";

interface Props {
  state: GameState;
  progress: string;
  rng: { source: RngSource; remaining: number };
  onEject: () => void;
  onReplay: () => void;
  onCertificate: () => void;
  onMenu: () => void;
  onFreshSeed?: () => void;
  freshSeedBusy?: boolean;
  coherence: number;
}

export function StatusPanel({ state, progress, rng, onEject, onReplay, onCertificate, onMenu, onFreshSeed, freshSeedBusy, coherence }: Props) {
  const pair = QUESTION_PAIRS[currentPair(state)];
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl bg-panel border border-line p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted">Level {state.level.index}</div>
            <div className="text-base font-semibold">{state.level.title}</div>
          </div>
          <button onClick={onMenu} className="text-xs text-muted hover:text-ink underline">
            menu
          </button>
        </div>
        <p className="text-sm text-ink mt-2 leading-snug">{state.level.goalText}</p>
        {progress && <p className="text-xs text-accent-2 mt-1 mono">{progress}</p>}
        {state.level.sandbox && (
          <p className="text-xs text-muted mt-1">
            Era {state.era + 1} of {ERAS.length}: <span className="text-ink">{ERAS[state.era]}</span> · questions: {pair.z.label} / {pair.x.label}
          </p>
        )}
      </div>

      <div className="rounded-xl bg-panel border border-line p-3 flex items-center gap-3">
        <CoherenceDial value={coherence} threshold={state.level.coherenceThreshold} size={150} />
        <div className="text-sm">
          <div className="text-[11px] uppercase tracking-wide text-muted">Season</div>
          <div className="text-2xl font-semibold">
            {state.season}
            <span className="text-muted text-base"> / {state.level.maxSeasons}</span>
          </div>
          {state.level.careBudget > 0 && (
            <div className="text-xs text-muted mt-1">
              care left: <span className="text-ink">{state.careLeft}</span>
            </div>
          )}
          <div className="text-xs text-muted mt-1">
            quantum outcomes left: <span className="text-ink">{rng.remaining}</span>
          </div>
          <div className="text-[11px] text-muted">
            next draw: <span className="mono text-ink">{rng.source}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-panel border border-line p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted mb-2">Cohorts</div>
        <div className="flex flex-col gap-2">
          {state.cohorts.map((c) => {
            const hidden = isHidden(state, c.index);
            const visible = cohortPurityVisible(state, c.index);
            const pur = cohortPurity(state, c.index);
            const erode = c.deprivation * DEPHASE_PER_SEASON;
            return (
              <div key={c.index} className="rounded-lg bg-bg-2 border border-line/60 px-2 py-1.5" style={{ borderLeft: `3px solid ${hidden ? "#3a4670" : c.color}` }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium" style={{ color: hidden ? "#5a6690" : c.color }}>
                    {hidden ? "not listed" : c.name}
                  </span>
                  <span className="text-xs mono text-muted" title="purity of this cohort alone, readable only if asked in the last 3 seasons">
                    purity {hidden ? "?" : visible ? pur.toFixed(2) : "?"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 flex-1 rounded bg-line/60 overflow-hidden" title={`deprivation ${c.deprivation.toFixed(2)}: erodes ${(erode * 100).toFixed(1)}% of coherence per season`}>
                    <div className="h-full rounded" style={{ width: `${Math.min(100, (c.deprivation / 0.5) * 100)}%`, background: c.deprivation > 0.15 ? "#f28a8a" : "#f2c98a" }} />
                  </div>
                  <span className="text-[10px] mono text-muted w-[92px] text-right">deprivation {c.deprivation.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  {hidden ? "no question reaches them" : c.lastStance ? (
                    <>
                      last stance: <span className="text-ink mono">{c.lastStance.stance}</span> <span className="opacity-70">({c.lastStance.basis}, season {c.lastStance.season})</span>
                    </>
                  ) : (
                    "unasked"
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-panel border border-line p-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wide text-muted">World-Line</div>
          <div className="flex gap-2">
            <button onClick={onEject} className="text-[11px] px-2 py-1 rounded border border-line hover:border-accent text-ink">
              Eject to QASM
            </button>
            <button onClick={onReplay} className="text-[11px] px-2 py-1 rounded border border-line hover:border-accent text-ink">
              Replay
            </button>
          </div>
        </div>
        <p className="mono text-xs mt-2 leading-relaxed break-words text-ink/90 max-h-28 overflow-auto scroll-thin">{worldLineText(state) || <span className="text-muted">nothing yet</span>}</p>
        {state.mythemes.length > 0 && (
          <p className="text-[11px] text-muted mt-1">
            opening myth{state.mythemes.length > 1 ? "s" : ""} applied: {state.mythemes.length} (marked ᵐ)
          </p>
        )}
      </div>

      <div className="rounded-xl bg-panel border border-line p-3 flex flex-wrap gap-2 items-center">
        <button onClick={onCertificate} className="text-[11px] px-2 py-1 rounded border border-line hover:border-accent-2 text-ink">
          Entropy certificate
        </button>
        {onFreshSeed && (
          <button onClick={onFreshSeed} disabled={freshSeedBusy} className="text-[11px] px-2 py-1 rounded border border-line hover:border-accent-2 text-ink">
            {freshSeedBusy ? "Fetching…" : "Fetch a fresh certified seed"}
          </button>
        )}
      </div>
    </div>
  );
}
