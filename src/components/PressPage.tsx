"use client";
// Fixed-size frames for the cover and screenshots. scripts/render-press.mjs
// screenshots #cover and #shot-1..3; without Playwright, screenshot them by hand.
import { useMemo } from "react";
import { BornRng, parseWord } from "@/sim";
import { sessionRng } from "@/lib/moth";
import { createGame, step } from "@/game/engine";
import type { GameAction, GameEvent, GameState } from "@/game/types";
import { levelById } from "@/levels/levels";
import { GameScreen } from "./GameScreen";
import { BraidCanvas } from "./BraidCanvas";
import { BraidMark } from "./svg/BraidMark";

const fixed = () => new BornRng(Array.from({ length: 64 }, (_, i) => ({ u: ((i * 0.6180339887) % 1) * 0.98 + 0.01, source: "classical-fallback" as const, detail: "press fixture" })));
const braids = (w: string): GameAction[] => parseWord(w).map((c) => ({ type: "braid", k: c.k, inverse: c.inverse }));

function play(levelId: string, actions: GameAction[], mythemes = []): { state: GameState; events: GameEvent[]; contact: GameEvent | null } {
  const rng = fixed();
  let s = createGame(levelById(levelId), mythemes);
  let events: GameEvent[] = [];
  let contact: GameEvent | null = null;
  for (const a of actions) {
    s = step(s, a, rng);
    events = s.events;
    contact = events.find((e) => e.type === "contact") ?? contact;
  }
  return { state: s, events, contact };
}

function Frame({ id, w, h, label, children }: { id: string; w: number; h: number; label: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="text-xs text-muted mb-1 mono">
        #{id} · {w}×{h} · {label}
      </div>
      <div id={id} style={{ width: w, height: h, overflow: "hidden", background: "var(--bg)", position: "relative" }} className="press-frame border border-line">
        {children}
      </div>
    </div>
  );
}

export function PressPage() {
  const noop = () => {};
  const shots = useMemo(() => {
    const unasked = play("unasked", braids("s2 s3 s4"));
    const federation = play("federation", [...braids("s2' s4"), { type: "bell" }]);
    const sandbox = play("sandbox", [
      ...braids("s2 s4"),
      { type: "ask", cohort: 0, basis: "Z" },
      { type: "ask", cohort: 2, basis: "Z" },
      { type: "ask", cohort: 1, basis: "X" },
      ...braids("s3' s8 s1 s4 s2' s9"),
      { type: "ask", cohort: 3, basis: "Z" },
      { type: "care", cohort: 2 },
    ]);
    const cover = play("crossing", [{ type: "ask", cohort: 0, basis: "X" }, ...braids("s2 s3' s1 s2")]);
    return { unasked, federation, sandbox, cover };
  }, []);
  return (
    <main className="p-6">
      <h1 className="text-lg font-semibold mb-4">Press renders</h1>
      <Frame id="cover" w={630} h={500} label="itch.io cover">
        <div className="absolute inset-0 flex">
          <div className="w-[300px] flex flex-col justify-center p-8">
            <BraidMark size={56} />
            <div className="mt-4 text-4xl font-semibold tracking-tight leading-none">
              COHERENCE<span className="text-muted">:</span>
              <br />
              Braid
            </div>
            <p className="text-muted mt-3 text-sm leading-snug">You do not build a civilization. You ask it questions, and you braid it.</p>
            <p className="text-[11px] text-muted mt-4">Global Quantum Game Jam 2026 · theme: quantum braiding</p>
          </div>
          <div className="flex-1 flex items-center justify-center pr-4">
            <div style={{ width: 300 }}>
              <BraidCanvas state={shots.cover.state} animate={false} maxRows={6} />
            </div>
          </div>
        </div>
      </Frame>
      <Frame id="shot-1" w={1280} h={800} label="Level 5 · The Unasked · interference">
        <div style={{ width: 1280 }}>
          <GameScreen level={shots.unasked.state.level} mythemes={[]} rng={sessionRng()} onOutcome={noop} onNext={noop} onLevels={noop} onRetry={noop} hasNext initialState={shots.unasked.state} readOnly />
        </div>
      </Frame>
      <Frame id="shot-2" w={1280} h={800} label="Level 8 · The Federation · Bell test">
        <div style={{ width: 1280, height: 800, position: "relative" }}>
          <GameScreen
            level={shots.federation.state.level}
            mythemes={[]}
            rng={sessionRng()}
            onOutcome={noop}
            onNext={noop}
            onLevels={noop}
            onRetry={noop}
            hasNext
            initialState={shots.federation.state}
            initialEvents={shots.federation.events.filter((e) => e.type === "bell")}
            readOnly
          />
        </div>
      </Frame>
      <Frame id="shot-3" w={1280} h={800} label="Level 9 · Deep Time · contact">
        <div style={{ width: 1280, height: 800, position: "relative" }}>
          <GameScreen
            level={shots.sandbox.state.level}
            mythemes={[]}
            rng={sessionRng()}
            onOutcome={noop}
            onNext={noop}
            onLevels={noop}
            onRetry={noop}
            hasNext
            initialState={shots.sandbox.state}
            initialEvents={shots.sandbox.contact ? [shots.sandbox.contact] : []}
            readOnly
          />
        </div>
      </Frame>
    </main>
  );
}
