"use client";
import { useEffect, useState } from "react";
import type { Basis } from "@/sim";
import type { GameAction, GameState, WorldLineEntry } from "@/game/types";
import { allowedCrossings, canAct, crossingKind, currentPair, isHidden, stanceProbabilities } from "@/game/engine";
import { QUESTION_PAIRS } from "@/game/questions";
import { crossingTargets, subscript } from "@/sim";
import { describeSource } from "@/lib/moth";

type Tab = "ASK" | "BRAID" | "CARE";

interface Props {
  state: GameState;
  basis: Basis;
  onBasis: (b: Basis) => void;
  onAction: (a: GameAction) => void;
}

export function ActionPanel({ state, basis, onBasis, onAction }: Props) {
  const allowed = state.level.allowedActions;
  const tabs: Tab[] = (["ASK", "BRAID", "CARE"] as Tab[]).filter((t) => allowed.includes(t));
  const [tab, setTab] = useState<Tab>(tabs[0] ?? "ASK");
  const [cohort, setCohort] = useState(0);
  const [inverse, setInverse] = useState(false);
  useEffect(() => {
    if (!tabs.includes(tab)) setTab(tabs[0]);
  }, [tabs, tab]);
  const pair = QUESTION_PAIRS[currentPair(state)];
  const q = basis === "Z" ? pair.z : pair.x;
  const over = state.status !== "playing";
  const lastAsk = [...state.worldLine].reverse().find((e) => e.type === "ask") as Extract<WorldLineEntry, { type: "ask" }> | undefined;
  const lastIsAsk = state.worldLine.length > 0 && state.worldLine[state.worldLine.length - 1].type === "ask";

  const cohortPicker = (
    <div className="flex flex-wrap gap-1.5">
      {state.cohorts.map((c) => {
        const hidden = isHidden(state, c.index);
        const disabled = tab === "ASK" && hidden;
        return (
          <button
            key={c.index}
            disabled={disabled}
            onClick={() => setCohort(c.index)}
            className={`px-2.5 py-1 rounded-full text-xs border ${cohort === c.index ? "border-ink text-ink" : "border-line text-muted"}`}
            style={cohort === c.index ? { background: c.color + "22", borderColor: c.color, color: c.color } : {}}
          >
            {hidden ? (tab === "CARE" ? "the unlisted" : "not listed") : c.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-xl bg-panel border border-line p-3 flex flex-col gap-3">
      <div className="flex gap-1 border-b border-line pb-2">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-md text-sm font-medium ${tab === t ? "bg-panel-2 text-ink" : "text-muted hover:text-ink"}`}>
            {t}
          </button>
        ))}
        <div className="flex-1" />
        {allowed.includes("WAIT") && (
          <button disabled={over} onClick={() => onAction({ type: "wait" })} className="px-2 py-1 rounded-md text-xs text-muted border border-line hover:border-accent hover:text-ink" title="Take no action this season; the environment still moves">
            let the season pass
          </button>
        )}
      </div>

      {tab === "ASK" && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Who</div>
            {cohortPicker}
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Which question</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(["Z", "X"] as Basis[]).map((b) => {
                const qq = b === "Z" ? pair.z : pair.x;
                const pr = stanceProbabilities(state, cohort, b);
                const hidden = isHidden(state, cohort);
                return (
                  <button
                    key={b}
                    onClick={() => onBasis(b)}
                    className={`text-left rounded-lg border p-2 ${basis === b ? "border-accent bg-panel-2" : "border-line hover:border-muted"}`}
                  >
                    <div className="text-sm font-medium">{qq.label}</div>
                    <div className="text-xs text-muted">“{qq.prompt}”</div>
                    <div className="mono text-xs mt-1">
                      <span className="text-ink">{qq.stances[0]}</span> <span className="text-muted">{hidden ? "?" : pr.p0.toFixed(2)}</span>
                      <span className="text-muted"> · </span>
                      <span className="text-ink">{qq.stances[1]}</span> <span className="text-muted">{hidden ? "?" : pr.p1.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-muted mt-0.5">{b === "Z" ? "register basis (Z)" : "indefinite basis (X)"}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted mt-1 leading-snug">{pair.incompatibility}</p>
          </div>
          <button
            disabled={over || !canAct(state, { type: "ask", cohort, basis }).ok}
            onClick={() => onAction({ type: "ask", cohort, basis })}
            className="w-full py-3 rounded-lg bg-accent text-bg font-semibold text-base hover:brightness-110"
          >
            Ask the {state.cohorts[cohort].name}: {q.label}
          </button>
          {lastAsk && lastIsAsk && (
            <div className="rounded-lg border border-line bg-bg-2 p-2 fade-in">
              <div className="text-sm">
                The <span style={{ color: state.cohorts[lastAsk.cohort].color }}>{state.cohorts[lastAsk.cohort].name}</span> answered{" "}
                <span className="mono font-semibold">{lastAsk.stance}</span>
                <span className="text-muted text-xs">
                  {" "}
                  (p was {(lastAsk.outcome === 0 ? lastAsk.p0 : lastAsk.p1).toFixed(2)})
                </span>
              </div>
              <div className="mt-1 flex items-start gap-1.5">
                <span className={`text-[10px] mono px-1.5 py-0.5 rounded ${lastAsk.rngSource === "classical-fallback" ? "bg-line text-ink" : "bg-accent-2/20 text-accent-2"}`}>{lastAsk.rngSource}</span>
                <span className="text-[11px] text-muted leading-snug">
                  {lastAsk.rngDetail.startsWith("no draw") ? "No draw was needed: the answer was already certain." : `This outcome was ${describeSource(lastAsk.rngSource)}${lastAsk.rngSource !== "classical-fallback" ? `, ${lastAsk.rngDetail}` : "."}`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "BRAID" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-muted">Crossing</span>
            <div className="flex rounded-md border border-line overflow-hidden text-xs">
              <button onClick={() => setInverse(false)} className={`px-2 py-1 ${!inverse ? "bg-panel-2 text-ink" : "text-muted"}`}>
                over (σ)
              </button>
              <button onClick={() => setInverse(true)} className={`px-2 py-1 ${inverse ? "bg-panel-2 text-ink" : "text-muted"}`}>
                under (σ⁻¹)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {Array.from({ length: 2 * state.level.n - 1 }, (_, i) => i + 1).map((k) => {
              const kind = crossingKind(k);
              const targets = crossingTargets(k, state.level.n);
              const names = targets.map((t) => state.cohorts[t].name);
              const open = allowedCrossings(state).includes(k);
              const label = `σ${subscript(k)}${inverse ? "⁻¹" : ""}`;
              return (
                <button
                  key={k}
                  disabled={over || !open}
                  onClick={() => onAction({ type: "braid", k, inverse })}
                  title={open ? (kind === "internal" ? `ritual within the ${names[0]}` : `exchange between the ${names[0]} and the ${names[1]}`) : "not open on this level"}
                  className={`rounded-lg border p-2 text-left ${kind === "internal" ? "border-line" : "border-accent-2/50"} hover:border-accent`}
                >
                  <div className="text-base font-semibold">{label}</div>
                  <div className="text-[10px] text-muted">{kind === "internal" ? "internal · ritual" : "exchange"}</div>
                  <div className="text-[10px] truncate" style={{ color: state.cohorts[targets[0]].color }}>
                    {kind === "internal" ? names[0] : `${names[0]} ↔ ${names[1]}`}
                  </div>
                  {!open && <div className="text-[10px] text-danger">{state.level.sandbox ? "wall" : "closed"}</div>}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted leading-snug">
            Internal crossings change a cohort&apos;s phase; exchanges entangle neighbours. Braiding is reversible and never lowers coherence. Order matters.
          </p>
          {allowed.includes("BELL") && (
            <button disabled={over} onClick={() => onAction({ type: "bell" })} className="w-full py-3 rounded-lg bg-accent-2 text-bg font-semibold hover:brightness-110">
              Run the Bell test
            </button>
          )}
        </div>
      )}

      {tab === "CARE" && (
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Who</div>
            {cohortPicker}
          </div>
          <button
            disabled={over || !canAct(state, { type: "care", cohort }).ok}
            onClick={() => onAction({ type: "care", cohort })}
            className="w-full py-3 rounded-lg bg-danger/90 text-bg font-semibold hover:brightness-110"
          >
            Give care (−0.1 deprivation) · {state.careLeft} left
          </button>
          <p className="text-[11px] text-muted leading-snug">
            Deprivation is a decoherence source: each season it erodes a quarter of its value from the cohort&apos;s coherence. Care lowers it. It costs a season.
          </p>
        </div>
      )}
    </div>
  );
}
