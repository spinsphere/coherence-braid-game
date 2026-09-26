"use client";
import { useCallback, useEffect, useState } from "react";
import { LEVELS, levelById } from "@/levels/levels";
import { loadProgress, saveProgress, type Progress } from "@/lib/storage";
import { sessionRng } from "@/lib/moth";
import { GameScreen, type GameOutcome } from "./GameScreen";
import { AboutScreen, CodexScreen, LevelSelect, TitleScreen } from "./Screens";
import { TutorialModal } from "./Tutorial";
import { JourneyOverlay } from "./Journey";

type Screen = { name: "title" } | { name: "levels" } | { name: "codex" } | { name: "about" } | { name: "game"; levelId: string; run: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "title" });
  const [progress, setProgress] = useState<Progress>(() => ({ unlocked: 1, completed: [], mythemes: {}, codex: [], seenIntro: [], seenTutorial: false }));
  const [ready, setReady] = useState(false);
  /** the tutorial is open; when it closes, start this level (or nothing) */
  const [tutorial, setTutorial] = useState<{ then: string | null } | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  useEffect(() => {
    setProgress(loadProgress());
    setReady(true);
  }, []);
  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((p) => {
      const n = fn(p);
      saveProgress(n);
      return n;
    });
  }, []);

  const rng = sessionRng();

  const start = (levelId: string) => setScreen({ name: "game", levelId, run: Date.now() });

  /** the first time anyone presses Play, the tutorial comes first */
  const play = (levelId: string) => {
    if (progress.seenTutorial) start(levelId);
    else setTutorial({ then: levelId });
  };
  const closeTutorial = () => {
    const then = tutorial?.then ?? null;
    setTutorial(null);
    update((p) => ({ ...p, seenTutorial: true }));
    if (then) start(then);
  };

  const onOutcome = useCallback(
    (o: GameOutcome) => {
      update((p) => {
        const next: Progress = { ...p, completed: [...p.completed], codex: [...p.codex], mythemes: { ...p.mythemes } };
        if (o.entity && !next.codex.includes(o.entity)) next.codex.push(o.entity);
        if (o.type === "won") {
          if (!next.completed.includes(o.levelId)) next.completed.push(o.levelId);
          const idx = levelById(o.levelId).index;
          next.unlocked = Math.max(next.unlocked, Math.min(LEVELS.length, idx + 1));
        }
        if (o.type === "collapsed" && o.mytheme && o.mytheme.length) {
          const prev = next.mythemes[o.levelId] ?? [];
          const lvl = levelById(o.levelId);
          next.mythemes[o.levelId] = lvl.sandbox ? [...prev, o.mytheme].slice(-4) : [o.mytheme];
        }
        return next;
      });
    },
    [update],
  );

  if (!ready) return <main className="min-h-screen" />;

  const tutorialModal = tutorial ? <TutorialModal onDone={closeTutorial} /> : null;
  const mapOverlay = mapOpen ? (
    <JourneyOverlay
      progress={progress}
      onClose={() => setMapOpen(false)}
      onStart={(id) => {
        setMapOpen(false);
        play(id);
      }}
    />
  ) : null;

  if (screen.name === "game") {
    const level = levelById(screen.levelId);
    const nextLevel = LEVELS.find((l) => l.index === level.index + 1);
    return (
      <GameScreen
        key={`${screen.levelId}-${screen.run}`}
        level={level}
        mythemes={progress.mythemes[level.id] ?? []}
        rng={rng}
        onOutcome={onOutcome}
        hasNext={Boolean(nextLevel)}
        progress={progress}
        onNext={() => nextLevel && start(nextLevel.id)}
        onLevels={() => setScreen({ name: "levels" })}
        onRetry={() => start(level.id)}
      />
    );
  }
  if (screen.name === "levels")
    return (
      <>
        <LevelSelect
          progress={progress}
          onBack={() => setScreen({ name: "title" })}
          onStart={play}
          onMap={() => setMapOpen(true)}
          onUnlockAll={() => update((p) => ({ ...p, unlocked: LEVELS.length }))}
        />
        {tutorialModal}
        {mapOverlay}
      </>
    );
  if (screen.name === "codex") return <CodexScreen progress={progress} onBack={() => setScreen({ name: "title" })} />;
  if (screen.name === "about") return <AboutScreen onBack={() => setScreen({ name: "title" })} />;
  const nextUnfinished = LEVELS.find((l) => !progress.completed.includes(l.id) && l.index <= progress.unlocked) ?? LEVELS[0];
  return (
    <>
      <TitleScreen
        onPlay={() => play(nextUnfinished.id)}
        onTutorial={() => setTutorial({ then: null })}
        onMap={() => setMapOpen(true)}
        onLevels={() => setScreen({ name: "levels" })}
        onCodex={() => setScreen({ name: "codex" })}
        onAbout={() => setScreen({ name: "about" })}
        quantumLeft={rng.remaining()}
        source={rng.source()}
      />
      {tutorialModal}
      {mapOverlay}
    </>
  );
}
