"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Basis, BornRng, Crossing } from "@/sim";
import { exportQasm, type QasmOp } from "@/sim";
import type { GameAction, GameEvent, GameState, Level } from "@/game/types";
import { coherence, createGame, interferenceReport, step } from "@/game/engine";
import { evaluateGoal } from "@/levels/goals";
import { BraidCanvas } from "./BraidCanvas";
import { Cloud } from "./Cloud";
import { StatusPanel } from "./StatusPanel";
import { ActionPanel } from "./ActionPanel";
import { BellModal, CertificateModal, CloudsModal, CollapseModal, ContactModal, FailedModal, InfoModal, IntroModal, OrderModal, QasmModal, WinModal } from "./modals/Modals";
import { HelpModal, HintModal } from "./modals/HelpModals";
import { JourneyOverlay } from "./Journey";
import type { Progress } from "@/lib/storage";
import { describeAction, nextHint } from "@/game/hints";
import type { EntityId } from "@/game/contact";
import { mothProxyUrl } from "@/lib/moth";
import { uniformsFromBytes, hexToBytes } from "@/sim";

export interface GameOutcome {
  type: "won" | "collapsed" | "failed";
  levelId: string;
  mytheme?: Crossing[];
  entity?: EntityId;
}

interface Props {
  level: Level;
  mythemes: Crossing[][];
  rng: BornRng;
  onOutcome: (o: GameOutcome) => void;
  onNext: () => void;
  onLevels: () => void;
  onRetry: () => void;
  hasNext: boolean;
  /** saved progress, for the map */
  progress?: Progress;
  /** press renders: no intro, no interaction */
  initialState?: GameState;
  readOnly?: boolean;
  initialEvents?: GameEvent[];
}

type ModalItem = GameEvent | { type: "intro" } | { type: "certificate" } | { type: "qasm"; text: string } | { type: "hint" } | { type: "help" };

export function GameScreen({ level, mythemes, rng, onOutcome, onNext, onLevels, onRetry, hasNext, progress, initialState, readOnly = false, initialEvents }: Props) {
  const [state, setState] = useState<GameState>(() => initialState ?? createGame(level, mythemes));
  const [basis, setBasis] = useState<Basis>(initialState && initialState.level.showInterference ? "X" : "Z");
  const [queue, setQueue] = useState<ModalItem[]>(() => (readOnly ? [...(initialEvents ?? [])] : [{ type: "intro" }]));
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [seedBusy, setSeedBusy] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [, setTick] = useState(0);
  const reported = useRef(false);

  const dispatch = useCallback(
    (action: GameAction) => {
      if (readOnly) return;
      setState((prev) => {
        const next = step(prev, action, rng);
        if (next === prev) return prev;
        const modals: ModalItem[] = [];
        for (const e of next.events) {
          if (e.type === "era") setToast(`A new era: ${e.era}`);
          else if (e.type === "revealed") modals.push(e);
          else modals.push(e);
        }
        if (modals.length) setQueue((q) => [...q, ...modals]);
        setTick((t) => t + 1);
        return next;
      });
    },
    [rng, readOnly],
  );

  // report the outcome once
  useEffect(() => {
    if (readOnly || reported.current || state.status === "playing") return;
    reported.current = true;
    const ev = state.events.find((e) => e.type === "collapsed");
    onOutcome({
      type: state.status,
      levelId: state.level.id,
      mytheme: ev && ev.type === "collapsed" ? ev.mytheme : undefined,
      entity: (state.contactEntity as EntityId | null) ?? undefined,
    });
  }, [state, onOutcome, readOnly]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const verdict = useMemo(() => evaluateGoal(state), [state]);
  const coh = coherence(state);

  const qasm = useCallback(() => {
    const ops: QasmOp[] = [];
    for (const e of state.worldLine) {
      if (e.type === "braid") ops.push({ type: "braid", k: e.k, inverse: e.inverse });
      else if (e.type === "ask") ops.push({ type: "ask", qubit: e.cohort, basis: e.basis });
      else if (e.type === "care") ops.push({ type: "comment", text: `care for cohort ${e.cohort + 1} (classical: lowers deprivation)` });
      else if (e.type === "bell") ops.push({ type: "comment", text: `Bell test S=${e.S.toFixed(3)}` });
    }
    return exportQasm(state.level.n, ops);
  }, [state]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const proxy = mothProxyUrl();
  const fetchSeed = proxy
    ? async () => {
        setSeedBusy(true);
        try {
          const res = await fetch(`${proxy}/api/moth/seed`);
          const j = (await res.json()) as { bytesHex?: string; jobId?: string; engine?: string; error?: string };
          if (j.bytesHex && j.bytesHex.length >= 8) {
            const us = uniformsFromBytes(hexToBytes(j.bytesHex));
            rng.prepend(us.map((u) => ({ u, source: "moth-qrng" as const, detail: `${j.engine ?? "comet-qrng-v1"} (live), job ${j.jobId ?? "?"}` })));
            setToast(`Fresh seed: ${us.length} certified outcomes added`);
          } else setToast(j.error ? `Seed refused: ${j.error}` : "The fresh job returned a certificate but no extractable bytes");
        } catch {
          setToast("Could not reach the seed route");
        } finally {
          setSeedBusy(false);
          setTick((t) => t + 1);
        }
      }
    : undefined;

  const current = queue[0];
  const pop = () => setQueue((q) => q.slice(1));

  // the solver runs only while its popup is open, or once per state for the stage marker
  const hint = useMemo(() => nextHint(state), [state]);
  const openHint = () => setQueue((q) => [...q, { type: "hint" }]);
  const openHelp = () => setQueue((q) => [...q, { type: "help" }]);
  const playHint = () => {
    pop();
    if (!hint.action) return;
    const label = describeAction(state, hint.action);
    dispatch(hint.action);
    setToast(`Played for you: ${label}`);
  };

  const interference = state.level.showInterference ? interferenceReport(state) : null;

  return (
    <div className="min-h-screen p-3 sm:p-4 max-w-[1500px] mx-auto">
      {toast && <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-panel-2 border border-line text-sm fade-in">{toast}</div>}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] uppercase tracking-wide text-muted">Level {state.level.index}</span>
          <span className="text-sm font-semibold ml-2">{state.level.title}</span>
          <span className="text-xs text-muted ml-2 hidden sm:inline">{state.level.subtitle}</span>
        </div>
        {!readOnly && (
          <div className="flex gap-1.5">
            <button onClick={openHelp} className="px-3 py-1.5 rounded-lg border border-line hover:border-accent text-sm" title="What this level is about and how to play it">
              Help
            </button>
            <button onClick={() => setMapOpen(true)} className="px-3 py-1.5 rounded-lg border border-line hover:border-accent text-sm" title="The whole journey, and where you are on it">
              Map
            </button>
            <button onClick={openHint} className="px-3 py-1.5 rounded-lg bg-accent text-bg font-semibold text-sm hover:brightness-110" title="See the next move explained, and let the game make it for you">
              Stuck?
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_340px] gap-3 items-start">
        <div className="order-3 lg:order-1">
          <StatusPanel
            state={state}
            progress={verdict.progress}
            rng={{ source: rng.source(), remaining: rng.remaining() }}
            coherence={coh}
            onEject={() => setQueue((q) => [...q, { type: "qasm", text: qasm() }])}
            onReplay={onRetry}
            onCertificate={() => setQueue((q) => [...q, { type: "certificate" }])}
            onMenu={onLevels}
            onFreshSeed={fetchSeed}
            freshSeedBusy={seedBusy}
          />
        </div>
        <div className="order-1 lg:order-2 rounded-xl bg-panel border border-line p-3 flex flex-col gap-3">
          <Cloud state={state} basis={basis} />
          {interference && (
            <div className="rounded-lg bg-bg-2 border border-line p-2 text-xs">
              <div className="text-[11px] uppercase tracking-wide text-muted mb-1">Interference · p(ENTER) if asked now</div>
              <div className="flex flex-wrap gap-3">
                {interference.map((r) => (
                  <div key={r.cohort} className="mono">
                    <span style={{ color: state.cohorts[r.cohort].color }}>{state.cohorts[r.cohort].name}</span> quantum {r.quantum.toFixed(2)} · classical mixture {r.classical.toFixed(2)} ·{" "}
                    <span className={Math.abs(r.quantum - r.classical) > 0.05 ? "text-accent" : "text-muted"}>interference {(r.quantum - r.classical >= 0 ? "+" : "") + (r.quantum - r.classical).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <p className="text-muted mt-1">The classical mixture is what you would predict if every unasked cohort had secretly decided. The gap is the part of the peace that only exists unasked.</p>
            </div>
          )}
          <div className="flex-1 min-h-[280px]">
            <BraidCanvas state={state} showCut={Boolean(state.level.bell)} />
          </div>
        </div>
        <div className="order-2 lg:order-3">
          <ActionPanel state={state} basis={basis} onBasis={setBasis} onAction={dispatch} />
        </div>
      </div>

      {current && current.type === "intro" && <IntroModal state={state} onBegin={pop} />}
      {current && current.type === "won" && <WinModal state={state} onNext={onNext} onLevels={onLevels} hasNext={hasNext} />}
      {current && current.type === "collapsed" && <CollapseModal state={state} mytheme={current.mytheme} onRetry={onRetry} onLevels={onLevels} />}
      {current && current.type === "failed" && <FailedModal reason={current.reason} onRetry={onRetry} onLevels={onLevels} />}
      {current && current.type === "contact" && <ContactModal entityId={current.entityId as EntityId} reading={current.reading} onClose={pop} />}
      {current && current.type === "order" && <OrderModal state={state} data={current.data} onClose={pop} />}
      {current && current.type === "clouds" && <CloudsModal state={state} data={current.data} onClose={pop} />}
      {current && current.type === "bell" && <BellModal state={state} data={current.data} onClose={pop} />}
      {current && current.type === "certificate" && <CertificateModal onClose={pop} />}
      {current && current.type === "qasm" && <QasmModal text={current.text} copied={copied} onCopy={() => copy(current.text)} onClose={pop} />}
      {current && current.type === "revealed" && (
        <InfoModal kicker="The register" title={`The ${state.cohorts[current.cohort].name} are listed now`} body="Their questions can be asked. Their purity was never hidden from the dial, only from you." onClose={pop} />
      )}
      {current && current.type === "era" && <InfoModal kicker="Deep time" title={`A new era: ${current.era}`} body="The questions change with the era." onClose={pop} />}
      {mapOpen && progress && <JourneyOverlay progress={progress} current={{ state, phase: hint.phase }} onClose={() => setMapOpen(false)} />}
      {current && current.type === "hint" && <HintModal state={state} hint={hint} onDoIt={playHint} onClose={pop} onRetry={onRetry} />}
      {current && current.type === "help" && (
        <HelpModal
          state={state}
          phase={hint.phase}
          onClose={pop}
          onStuck={() => setQueue((q) => [{ type: "hint" }, ...q.slice(1)])}
        />
      )}
    </div>
  );
}
