import type { Crossing } from "@/sim";

const KEY = "coherence-braid.v1";

export interface Progress {
  unlocked: number; // highest level index unlocked (1-based)
  completed: string[];
  mythemes: Record<string, Crossing[][]>;
  codex: string[];
  seenIntro: string[];
}

const DEFAULT: Progress = { unlocked: 1, completed: [], mythemes: {}, codex: [], seenIntro: [] };

export function loadProgress(): Progress {
  try {
    if (typeof window === "undefined") return { ...DEFAULT };
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const p = JSON.parse(raw) as Partial<Progress>;
    return { ...DEFAULT, ...p, mythemes: p.mythemes ?? {}, completed: p.completed ?? [], codex: p.codex ?? [] };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveProgress(p: Progress): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: the game still runs */
  }
}

export function resetProgress(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
