"use client";
import { useId } from "react";
import type { Basis } from "@/sim";
import type { GameState } from "@/game/types";
import { currentPair, isHidden, stanceProbabilities } from "@/game/engine";
import { questionFor } from "@/game/questions";

export interface CloudCohort {
  name: string;
  color: string;
  p: [number, number];
  hidden?: boolean;
}

export function CloudRow({ cohorts, stances, title, compact = false }: { cohorts: CloudCohort[]; stances: [string, string]; title?: string; compact?: boolean }) {
  const uid = useId();
  const w = compact ? 84 : 104;
  const h = compact ? 56 : 66;
  return (
    <div className="w-full">
      {title && <div className="text-xs text-muted mb-1">{title}</div>}
      <div className="flex flex-wrap justify-center gap-2">
        {cohorts.map((c, i) => {
          const [a, b] = c.p;
          return (
            <div key={i} className="flex flex-col items-center" style={{ width: w }}>
              <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label={`${c.name}: ${stances[0]} ${(a * 100).toFixed(0)}%, ${stances[1]} ${(b * 100).toFixed(0)}%`}>
                <defs>
                  <filter id={`${uid}-b`} x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation={compact ? 5 : 6} />
                  </filter>
                </defs>
                {c.hidden ? (
                  <g filter={`url(#${uid}-b)`}>
                    <ellipse cx={w / 2} cy={h / 2} rx={w * 0.3} ry={h * 0.32} fill="#3a4670" opacity={0.8} />
                  </g>
                ) : (
                  <g filter={`url(#${uid}-b)`}>
                    <ellipse cx={w * 0.36} cy={h / 2} rx={w * 0.24} ry={h * 0.3} fill={c.color} opacity={Math.max(0.06, a)} />
                    <ellipse cx={w * 0.64} cy={h / 2} rx={w * 0.24} ry={h * 0.3} fill={c.color} opacity={Math.max(0.06, b)} />
                  </g>
                )}
                {c.hidden && (
                  <text x={w / 2} y={h / 2 + 5} fill="#9aa5cc" fontSize={14} textAnchor="middle">
                    ?
                  </text>
                )}
              </svg>
              <div className="text-[11px] leading-tight text-center" style={{ color: c.color }}>
                {c.name}
              </div>
              {!c.hidden && (
                <div className="text-[10px] text-muted leading-tight text-center mono">
                  {stances[0]} {a.toFixed(2)} · {stances[1]} {b.toFixed(2)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Cloud({ state, basis }: { state: GameState; basis: Basis }) {
  const q = questionFor(currentPair(state), basis);
  const cohorts: CloudCohort[] = state.cohorts.map((c) => {
    const hidden = isHidden(state, c.index);
    const pr = stanceProbabilities(state, c.index, basis);
    return { name: c.name, color: c.color, p: [pr.p0, pr.p1], hidden };
  });
  return <CloudRow cohorts={cohorts} stances={q.stances} title={`The cloud · ${q.label}: “${q.prompt}”`} />;
}
