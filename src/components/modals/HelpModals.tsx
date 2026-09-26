"use client";
import type { GameState } from "@/game/types";
import type { Hint } from "@/game/hints";
import { describeSituation } from "@/game/hints";
import { helpFor } from "@/content/help";
import { Btn, Modal } from "@/components/Modal";

/** The stages of a level with the current one marked. Shared by Help, Stuck? and the Map. */
export function StageList({ levelId, phase, done = false, compact = false }: { levelId: string; phase: number; done?: boolean; compact?: boolean }) {
  const stages = helpFor(levelId).stages;
  return (
    <ol className={`flex flex-col ${compact ? "gap-1" : "gap-1.5"}`}>
      {stages.map((s, i) => {
        const state = done || i < phase ? "done" : i === phase ? "now" : "next";
        return (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`mt-0.5 shrink-0 h-4 w-4 rounded-full text-[10px] flex items-center justify-center border ${
                state === "done" ? "bg-ok/20 border-ok text-ok" : state === "now" ? "bg-accent border-accent text-bg font-semibold" : "border-line text-muted"
              }`}
              aria-label={state}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span className={compact ? "text-xs leading-snug" : "text-sm leading-snug"}>
              <span className={state === "now" ? "text-accent font-medium" : state === "done" ? "text-ink/80" : "text-muted"}>{s.label}</span>
              {!compact && <span className="text-muted"> · {s.detail}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function HintModal({ state, hint, onDoIt, onClose, onRetry }: { state: GameState; hint: Hint; onDoIt: () => void; onClose: () => void; onRetry: () => void }) {
  const help = helpFor(state.level.id);
  const stage = help.stages[hint.phase];
  const over = state.status !== "playing";
  return (
    <Modal
      kicker={`Stuck? · stage ${hint.phase + 1} of ${help.stages.length}: ${stage?.label ?? ""}`}
      title={hint.title}
      actions={
        <>
          <Btn onClick={onClose}>{over ? "Close" : "I’ll do it myself"}</Btn>
          {hint.restart && (
            <Btn primary onClick={onRetry}>
              Replay the level
            </Btn>
          )}
          {hint.action && !over && (
            <Btn primary onClick={onDoIt}>
              Do it for me
            </Btn>
          )}
        </>
      }
    >
      <div className="rounded-lg bg-bg-2 border border-line p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted">Where you are</div>
        <p className="mt-1 text-sm">{describeSituation(state)}</p>
      </div>
      <div className="mt-3">
        <div className="text-[11px] uppercase tracking-wide text-muted">{over ? "What happened" : "What comes next, and why"}</div>
        <p className="mt-1">{hint.why}</p>
        {hint.coin && !over && <p className="mt-2 text-xs text-accent-2">This move is a Born-rule draw. The solver will handle whichever way it lands.</p>}
      </div>
      <div className="mt-3">
        <div className="text-[11px] uppercase tracking-wide text-muted mb-1">The stages of this level</div>
        <StageList levelId={state.level.id} phase={hint.phase} done={state.status === "won"} compact />
      </div>
    </Modal>
  );
}

export function HelpModal({ state, phase, onClose, onStuck }: { state: GameState; phase: number; onClose: () => void; onStuck: () => void }) {
  const help = helpFor(state.level.id);
  return (
    <Modal
      kicker={`Help · Level ${state.level.index} · ${state.level.subtitle}`}
      title={state.level.title}
      actions={
        <>
          <Btn onClick={onClose}>Close</Btn>
          {state.status === "playing" && (
            <Btn primary onClick={onStuck}>
              Stuck? Show me the next move
            </Btn>
          )}
        </>
      }
      wide
    >
      <div className="text-[11px] uppercase tracking-wide text-muted">The idea</div>
      <p className="mt-1">{help.concept}</p>
      <div className="text-[11px] uppercase tracking-wide text-muted mt-3">Goal</div>
      <p className="mt-1 text-accent-2">{state.level.goalText}</p>
      <div className="text-[11px] uppercase tracking-wide text-muted mt-3">How to play it</div>
      <ol className="mt-1 list-decimal pl-5 flex flex-col gap-1">
        {help.howTo.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ol>
      <p className="mt-3 rounded-lg bg-bg-2 border border-line p-2 text-sm">
        <span className="text-accent">Tip.</span> {help.tip}
      </p>
      <div className="text-[11px] uppercase tracking-wide text-muted mt-3 mb-1">Where you are</div>
      <StageList levelId={state.level.id} phase={phase} done={state.status === "won"} />
      <div className="text-[11px] uppercase tracking-wide text-muted mt-3">The open actions</div>
      <p className="mt-1 text-sm text-muted">
        {state.level.allowedActions.includes("ASK") && "ASK creates a fact by the Born rule. "}
        {state.level.allowedActions.includes("BRAID") && "BRAID crosses strands: rituals within a cohort, exchanges between neighbours; reversible, order matters. "}
        {state.level.allowedActions.includes("CARE") && "CARE lowers a cohort’s deprivation by 0.1 and costs a season. "}
        {(state.level.allowedActions.includes("WAIT") || state.level.allowedActions.includes("CARE")) && "Letting a season pass moves the environment only. "}
        {state.level.allowedActions.includes("BELL") && "BELL runs the CHSH test across the cut. "}
      </p>
    </Modal>
  );
}
