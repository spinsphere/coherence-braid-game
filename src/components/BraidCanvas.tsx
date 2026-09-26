"use client";
import { useId, useMemo } from "react";
import type { GameState, WorldLineEntry } from "@/game/types";
import { isHidden } from "@/game/engine";

interface Props {
  state: GameState;
  maxRows?: number;
  /** animate the newest row */
  animate?: boolean;
  showCut?: boolean;
}

const SX = 36;
const RY = 36;
const MARGIN = 44;
const PAD_TOP = 18;
const PAD_BOTTOM = 46;

type Seg = { d: string; color: string; opacity: number; dashed: boolean; key: string };

function strandColor(state: GameState, strand: number): { color: string; opacity: number } {
  const cohort = Math.floor(strand / 2);
  return { color: state.cohorts[cohort].color, opacity: strand % 2 === 0 ? 0.95 : 0.6 };
}

export function BraidCanvas({ state, maxRows = 14, animate = true, showCut = false }: Props) {
  const uid = useId();
  const n = state.level.n;
  const strands = 2 * n;
  const W = MARGIN * 2 + (strands - 1) * SX;
  const entries = state.worldLine;
  const start = Math.max(0, entries.length - maxRows);
  const visible = entries.slice(start);
  const R = Math.max(visible.length, 3);
  const H = PAD_TOP + R * RY + PAD_BOTTOM;
  const xOf = (p: number) => MARGIN + p * SX;

  const rows = useMemo(() => {
    // positions[strand] = position; replay rows before the window
    let pos: number[] = Array.from({ length: strands }, (_, i) => i);
    const advance = (e: WorldLineEntry, p: number[]) => {
      if (e.type !== "braid") return p;
      const a = e.k - 1;
      const b = e.k;
      const sA = p.indexOf(a);
      const sB = p.indexOf(b);
      const next = [...p];
      next[sA] = b;
      next[sB] = a;
      return next;
    };
    for (let i = 0; i < start; i++) pos = advance(entries[i], pos);
    const out: { entry: WorldLineEntry; before: number[]; after: number[]; index: number }[] = [];
    for (let i = 0; i < visible.length; i++) {
      const after = advance(visible[i], pos);
      out.push({ entry: visible[i], before: pos, after, index: start + i });
      pos = after;
    }
    return { rows: out, finalPos: pos, startPos: out.length ? out[0].before : pos };
  }, [entries, start, visible, strands]);

  const hiddenCohort = state.level.hidden?.cohort ?? -1;
  const hiddenNow = hiddenCohort >= 0 && isHidden(state, hiddenCohort);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: "70vh", maxWidth: W * 2.1, display: "block", margin: "0 auto" }} role="img" aria-label="Braid diagram of the World-Line">
      <defs>
        <path id={`${uid}-heart`} d="M0 3 C0 1, -3 -1, -3 -3 C-3 -5, 0 -5, 0 -3 C0 -5, 3 -5, 3 -3 C3 -1, 0 1, 0 3 Z" />
      </defs>
      {showCut && state.level.bell && (
        <g>
          <line
            x1={(xOf(2 * state.level.bell.left.length - 1) + xOf(2 * state.level.bell.left.length)) / 2}
            x2={(xOf(2 * state.level.bell.left.length - 1) + xOf(2 * state.level.bell.left.length)) / 2}
            y1={PAD_TOP}
            y2={PAD_TOP + R * RY}
            stroke="#9aa5cc"
            strokeDasharray="4 6"
            strokeWidth={1}
          />
          <text x={(xOf(2 * state.level.bell.left.length - 1) + xOf(2 * state.level.bell.left.length)) / 2} y={PAD_TOP - 6} fill="#9aa5cc" fontSize={9} textAnchor="middle">
            the cut
          </text>
        </g>
      )}
      {/* empty canvas: straight strands */}
      {visible.length === 0 &&
        Array.from({ length: strands }, (_, s) => {
          const c = strandColor(state, s);
          const hid = Math.floor(s / 2) === hiddenCohort && hiddenNow;
          return (
            <line
              key={s}
              x1={xOf(s)}
              x2={xOf(s)}
              y1={PAD_TOP}
              y2={PAD_TOP + R * RY}
              stroke={hid ? "#3a4670" : c.color}
              strokeOpacity={c.opacity}
              strokeWidth={2.2}
              strokeDasharray={hid ? "3 5" : undefined}
              strokeLinecap="round"
            />
          );
        })}
      {/* pad rows above the visible entries so short World-Lines still show strands */}
      {visible.length > 0 &&
        visible.length < R &&
        Array.from({ length: strands }, (_, s) => {
          const c = strandColor(state, s);
          const p = rows.finalPos[s];
          const hid = Math.floor(s / 2) === hiddenCohort && hiddenNow;
          return (
            <line
              key={`pad-${s}`}
              x1={xOf(p)}
              x2={xOf(p)}
              y1={PAD_TOP}
              y2={PAD_TOP + (R - visible.length) * RY}
              stroke={hid ? "#3a4670" : c.color}
              strokeOpacity={c.opacity}
              strokeWidth={2.2}
              strokeDasharray={hid ? "3 5" : undefined}
            />
          );
        })}
      {rows.rows.map((row, i) => {
        const yb = PAD_TOP + (R - i) * RY;
        const yt = yb - RY;
        const ym = (yb + yt) / 2;
        const e = row.entry;
        const opening = e.type === "braid" && e.opening;
        const newest = animate && row.index === entries.length - 1 && !opening;
        const segs: Seg[] = [];
        let over: Seg | null = null;
        let under: Seg | null = null;
        for (let s = 0; s < strands; s++) {
          const x0 = xOf(row.before[s]);
          const x1 = xOf(row.after[s]);
          const c = strandColor(state, s);
          const hid = Math.floor(s / 2) === hiddenCohort && hiddenNow;
          const seg: Seg = {
            d: x0 === x1 ? `M ${x0} ${yb} L ${x1} ${yt}` : `M ${x0} ${yb} C ${x0} ${ym}, ${x1} ${ym}, ${x1} ${yt}`,
            color: hid ? "#3a4670" : c.color,
            opacity: c.opacity,
            dashed: hid,
            key: `${row.index}-${s}`,
          };
          if (e.type === "braid" && x0 !== x1) {
            const isOverStrand = e.inverse ? row.before[s] === e.k : row.before[s] === e.k - 1;
            if (isOverStrand) over = seg;
            else under = seg;
          } else segs.push(seg);
        }
        const draw = (seg: Seg, halo = false) => (
          <g key={seg.key}>
            {halo && <path d={seg.d} stroke="var(--bg)" strokeWidth={9} fill="none" />}
            <path d={seg.d} stroke={seg.color} strokeOpacity={seg.opacity} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeDasharray={seg.dashed ? "3 5" : undefined} />
          </g>
        );
        return (
          <g key={row.index} className={newest ? "row-in" : undefined} opacity={opening ? 0.45 : 1}>
            {segs.map((s) => draw(s))}
            {under && draw(under)}
            {over && draw(over, true)}
            {e.type === "braid" && (
              <text x={W - MARGIN + 12} y={ym + 3} fill="#9aa5cc" fontSize={9} textAnchor="start">
                σ{e.k}
                {e.inverse ? "⁻¹" : ""}
                {e.mytheme ? " myth" : opening ? " opening" : ""}
              </text>
            )}
            {e.type === "ask" &&
              [2 * e.cohort, 2 * e.cohort + 1].map((p) => (
                <circle
                  key={p}
                  cx={xOf(p)}
                  cy={ym}
                  r={5}
                  fill={e.basis === "Z" ? state.cohorts[e.cohort].color : "var(--bg)"}
                  stroke={state.cohorts[e.cohort].color}
                  strokeWidth={2}
                >
                  <title>
                    {e.basis === "Z" ? "asked in the register basis" : "asked in the indefinite basis"}: {e.stance}
                  </title>
                </circle>
              ))}
            {e.type === "ask" && (
              <text x={W - MARGIN + 12} y={ym + 3} fill="#9aa5cc" fontSize={9}>
                ask {e.basis}
              </text>
            )}
            {e.type === "care" && (
              <use href={`#${uid}-heart`} x={xOf(2 * e.cohort + 1) + 13} y={ym} fill="#f28a8a" transform={`translate(0 0) scale(1.4)`} style={{ transformOrigin: `${xOf(2 * e.cohort + 1) + 13}px ${ym}px` }} />
            )}
            {e.type === "care" && (
              <text x={W - MARGIN + 12} y={ym + 3} fill="#9aa5cc" fontSize={9}>
                care
              </text>
            )}
            {e.type === "wait" && <circle cx={MARGIN / 2} cy={ym} r={1.5} fill="#9aa5cc" />}
            {e.type === "bell" && (
              <g>
                <line x1={xOf(0)} x2={xOf(strands - 1)} y1={ym} y2={ym} stroke="#8ad3f2" strokeDasharray="2 4" />
                <text x={W - MARGIN + 12} y={ym + 3} fill="#8ad3f2" fontSize={9}>
                  Bell S={e.S.toFixed(2)}
                </text>
              </g>
            )}
          </g>
        );
      })}
      {/* cohort labels: positions are fixed, strands move */}
      {state.cohorts.map((c) => {
        const x = (xOf(2 * c.index) + xOf(2 * c.index + 1)) / 2;
        const hid = c.index === hiddenCohort && hiddenNow;
        return (
          <g key={c.index}>
            <line x1={xOf(2 * c.index)} x2={xOf(2 * c.index + 1)} y1={PAD_TOP + R * RY + 6} y2={PAD_TOP + R * RY + 6} stroke={hid ? "#3a4670" : c.color} strokeWidth={2} />
            <text x={x} y={PAD_TOP + R * RY + 22} fill={hid ? "#5a6690" : c.color} fontSize={10} textAnchor="middle">
              {hid ? "not listed" : c.name}
            </text>
            <text x={x} y={PAD_TOP + R * RY + 36} fill="#5a6690" fontSize={8} textAnchor="middle">
              {2 * c.index + 1}·{2 * c.index + 2}
            </text>
          </g>
        );
      })}
      <text x={6} y={PAD_TOP + 8} fill="#5a6690" fontSize={8}>
        time ↑
      </text>
    </svg>
  );
}
