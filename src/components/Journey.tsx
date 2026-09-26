"use client";
import { useEffect } from "react";
import { LEVELS } from "@/levels/levels";
import { helpFor } from "@/content/help";
import type { Progress } from "@/lib/storage";
import type { GameState } from "@/game/types";
import { coherence } from "@/game/engine";
import { evaluateGoal } from "@/levels/goals";
import { StageList } from "./modals/HelpModals";

type NodeStatus = "won" | "current" | "open" | "locked";

interface Props {
  progress: Progress;
  /** the level being played right now, if any, with the solver's stage index */
  current?: { state: GameState; phase: number };
  onClose: () => void;
  /** when given, unlocked levels can be started from the map */
  onStart?: (levelId: string) => void;
}

const COLORS: Record<NodeStatus, string> = { won: "#9af2b5", current: "#f2c98a", open: "#e8ecf7", locked: "#3a4670" };

function statusOf(levelId: string, index: number, progress: Progress, currentId: string | null): NodeStatus {
  if (currentId === levelId) return "current";
  if (progress.completed.includes(levelId)) return "won";
  if (index <= progress.unlocked) return "open";
  return "locked";
}

/** The whole game as one braid: nine crossings from the founding to deep time. */
function FlowStrip({ progress, currentId, currentFraction }: { progress: Progress; currentId: string | null; currentFraction: number }) {
  const n = LEVELS.length;
  const W = 720;
  const H = 96;
  const x0 = 48;
  const x1 = W - 48;
  const xs = LEVELS.map((_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  const y = 44;
  const done = progress.completed.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-3xl h-auto" role="img" aria-label={`Journey: ${done} of ${n} levels won`}>
      {/* two strands of the civilization, braided once per level */}
      {LEVELS.map((l, i) => {
        const a = i === 0 ? 8 : xs[i - 1];
        const b = xs[i];
        const status = statusOf(l.id, l.index, progress, currentId);
        const stroke = status === "locked" ? "#2a3563" : status === "won" ? "#9af2b5" : status === "current" ? "#f2c98a" : "#4a5690";
        const up = i % 2 === 0;
        return (
          <g key={l.id}>
            <path d={`M ${a} ${up ? y - 10 : y + 10} C ${(a + b) / 2} ${up ? y - 10 : y + 10}, ${(a + b) / 2} ${up ? y + 10 : y - 10}, ${b} ${up ? y + 10 : y - 10}`} stroke={stroke} strokeWidth={2.5} fill="none" strokeOpacity={0.9} />
            <path d={`M ${a} ${up ? y + 10 : y - 10} C ${(a + b) / 2} ${up ? y + 10 : y - 10}, ${(a + b) / 2} ${up ? y - 10 : y + 10}, ${b} ${up ? y - 10 : y + 10}`} stroke="#0b1020" strokeWidth={7} fill="none" />
            <path d={`M ${a} ${up ? y + 10 : y - 10} C ${(a + b) / 2} ${up ? y + 10 : y - 10}, ${(a + b) / 2} ${up ? y - 10 : y + 10}, ${b} ${up ? y - 10 : y + 10}`} stroke={stroke} strokeWidth={2.5} fill="none" strokeOpacity={0.55} />
          </g>
        );
      })}
      <path d={`M ${xs[n - 1]} ${y - 10} L ${W - 8} ${y - 10} M ${xs[n - 1]} ${y + 10} L ${W - 8} ${y + 10}`} stroke={progress.completed.includes(LEVELS[n - 1].id) ? "#9af2b5" : "#2a3563"} strokeWidth={2.5} strokeDasharray="4 4" />
      {LEVELS.map((l, i) => {
        const status = statusOf(l.id, l.index, progress, currentId);
        const c = COLORS[status];
        return (
          <g key={l.id}>
            {status === "current" && <circle cx={xs[i]} cy={y} r={15} fill="none" stroke={c} strokeWidth={1.5} strokeOpacity={0.5} />}
            {status === "current" && (
              <path
                d={arcPath(xs[i], y, 15, currentFraction)}
                stroke={c}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
              />
            )}
            <circle cx={xs[i]} cy={y} r={11} fill="#0b1020" stroke={c} strokeWidth={status === "locked" ? 1 : 2} />
            <text x={xs[i]} y={y + 4} fill={c} fontSize={11} fontWeight={600} textAnchor="middle">
              {status === "won" ? "✓" : l.index}
            </text>
            <text x={xs[i]} y={y + 34} fill={status === "locked" ? "#5a6690" : "#9aa5cc"} fontSize={9} textAnchor="middle">
              {l.title.length > 14 ? l.title.replace("The ", "").split(" ")[0] : l.title}
            </text>
          </g>
        );
      })}
      <text x={8} y={y - 18} fill="#9aa5cc" fontSize={9}>
        founding
      </text>
      <text x={W - 8} y={y - 18} fill="#9aa5cc" fontSize={9} textAnchor="end">
        deep time
      </text>
    </svg>
  );
}

function arcPath(cx: number, cy: number, r: number, fraction: number): string {
  const f = Math.max(0.001, Math.min(0.999, fraction));
  const a0 = -Math.PI / 2;
  const a1 = a0 + 2 * Math.PI * f;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${x1} ${y1}`;
}

export function JourneyOverlay({ progress, current, onClose, onStart }: Props) {
  const currentId = current?.state.level.id ?? null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const won = progress.completed.length;
  const stagesOfCurrent = current ? helpFor(current.state.level.id).stages.length : 1;
  const currentFraction = current ? (current.state.status === "won" ? 1 : current.phase / stagesOfCurrent) : 0;

  return (
    <div className="modal-root fixed inset-0 z-50 bg-black/70 overflow-auto scroll-thin fade-in" role="dialog" aria-modal="true" aria-label="The journey">
      <div className="min-h-full flex items-start justify-center p-3 sm:p-6">
        <div className="w-full max-w-3xl rounded-2xl bg-panel border border-line shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted">Map</div>
                <h2 className="text-xl font-semibold">The journey</h2>
                <p className="text-xs text-muted mt-0.5">
                  {won} of {LEVELS.length} levels won. One civilization, braided from the river to the Federation, then left to deep time.
                </p>
              </div>
              <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-line hover:border-accent text-sm shrink-0">
                Close
              </button>
            </div>
            <div className="mt-3 flex justify-center">
              <FlowStrip progress={progress} currentId={currentId} currentFraction={currentFraction} />
            </div>
          </div>

          <ol className="p-4 sm:p-5 flex flex-col relative">
            <li className="flex gap-3 pb-3">
              <span className="w-6 shrink-0 flex flex-col items-center">
                <span className="h-3 w-3 rounded-full bg-muted mt-1" />
                <span className="flex-1 w-px bg-line mt-1" />
              </span>
              <div className="text-xs text-muted pt-0.5">Founding. Every cohort in its register state, coherence 100, nothing asked.</div>
            </li>
            {LEVELS.map((l, i) => {
              const status = statusOf(l.id, l.index, progress, currentId);
              const help = helpFor(l.id);
              const isCurrent = status === "current" && current;
              const clickable = Boolean(onStart) && status !== "locked";
              const last = i === LEVELS.length - 1;
              return (
                <li key={l.id} className="flex gap-3 pb-3">
                  <span className="w-6 shrink-0 flex flex-col items-center">
                    <span
                      className="h-6 w-6 rounded-full border-2 flex items-center justify-center text-[11px] font-semibold"
                      style={{ borderColor: COLORS[status], color: COLORS[status], background: status === "current" ? "#f2c98a22" : "transparent" }}
                    >
                      {status === "won" ? "✓" : l.index}
                    </span>
                    {!last && <span className="flex-1 w-px mt-1" style={{ background: status === "won" ? "#9af2b5" : "#2a3563" }} />}
                  </span>
                  <div className={`flex-1 rounded-xl border p-3 ${status === "current" ? "border-accent bg-panel-2" : status === "locked" ? "border-line/40 opacity-60" : "border-line bg-bg-2"}`}>
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <div>
                        <span className="text-sm font-semibold">{l.title}</span>
                        <span className="text-xs text-muted ml-2">{l.subtitle}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] mono" style={{ color: COLORS[status] }}>
                          {status === "won" ? "won" : status === "current" ? "now" : status === "open" ? "open" : "locked"}
                        </span>
                        {clickable && (
                          <button onClick={() => onStart!(l.id)} className="text-[11px] px-2 py-0.5 rounded border border-line hover:border-accent">
                            {status === "won" ? "replay" : "play"}
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted mt-1 leading-snug">{help.concept.split(". ")[0]}.</p>
                    <div className="text-[11px] text-muted mt-1">
                      {l.n} cohorts · {l.allowedActions.join(" · ").toLowerCase()}
                      {l.contact ? " · contact" : ""}
                      {l.bell ? " · a cut" : ""}
                    </div>
                    {isCurrent && current && <CurrentDetail state={current.state} phase={current.phase} />}
                    {!isCurrent && status === "won" && (
                      <div className="mt-2">
                        <StageList levelId={l.id} phase={help.stages.length} done compact />
                      </div>
                    )}
                    {!isCurrent && status === "open" && (
                      <div className="mt-2">
                        <StageList levelId={l.id} phase={-1} compact />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
            <li className="flex gap-3">
              <span className="w-6 shrink-0 flex flex-col items-center">
                <span className="h-3 w-3 rounded-full mt-1" style={{ background: progress.completed.includes(LEVELS[LEVELS.length - 1].id) ? "#9af2b5" : "#3a4670" }} />
              </span>
              <div className="text-xs text-muted pt-0.5">Deep time. The civilization endures, or collapses into a myth that opens the next one.</div>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function CurrentDetail({ state, phase }: { state: GameState; phase: number }) {
  const coh = coherence(state);
  const v = evaluateGoal(state);
  const pct = Math.round((state.season / state.level.maxSeasons) * 100);
  return (
    <div className="mt-2 rounded-lg bg-bg-2 border border-line p-2">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="w-16">Season</span>
        <div className="flex-1 h-1.5 rounded bg-line/60 overflow-hidden">
          <div className="h-full rounded bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <span className="mono w-12 text-right text-ink">
          {state.season}/{state.level.maxSeasons}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted mt-1">
        <span className="w-16">Coherence</span>
        <div className="flex-1 h-1.5 rounded bg-line/60 overflow-hidden relative">
          <div className="h-full rounded" style={{ width: `${Math.round(coh * 100)}%`, background: coh >= state.level.coherenceThreshold ? "#9af2b5" : "#f28a8a" }} />
          <div className="absolute top-0 h-full w-px bg-danger" style={{ left: `${state.level.coherenceThreshold * 100}%` }} />
        </div>
        <span className="mono w-12 text-right text-ink">{Math.round(coh * 100)}</span>
      </div>
      {v.progress && <p className="text-[11px] text-accent-2 mono mt-1">{v.progress}</p>}
      <div className="mt-2">
        <StageList levelId={state.level.id} phase={phase} done={state.status === "won"} compact />
      </div>
      <p className="text-[11px] text-muted mt-1">{state.status === "playing" ? "Stuck? names the next move." : state.status === "won" ? "Won." : state.endReason}</p>
    </div>
  );
}
