"use client";
import { useState } from "react";
import { TUTORIAL, type TutorialArt } from "@/content/tutorial";
import { Btn, Modal } from "./Modal";

const C1 = "#f2c98a";
const C2 = "#8ad3f2";

function Art({ kind }: { kind: TutorialArt }) {
  const W = 240;
  const H = 120;
  const strand = (x: number, color: string, opacity: number) => <line x1={x} y1={H - 10} x2={x} y2={10} stroke={color} strokeWidth={3} strokeOpacity={opacity} strokeLinecap="round" />;
  switch (kind) {
    case "worldlines":
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {strand(70, C1, 0.95)}
          {strand(98, C1, 0.6)}
          {strand(142, C2, 0.95)}
          {strand(170, C2, 0.6)}
          <text x={84} y={H - 0} fill={C1} fontSize={10} textAnchor="middle">
            Elders
          </text>
          <text x={156} y={H - 0} fill={C2} fontSize={10} textAnchor="middle">
            Smiths
          </text>
          <path d={`M 20 ${H - 14} L 20 16`} stroke="#9aa5cc" strokeWidth={1} markerEnd="url(#tut-arrow)" />
          <defs>
            <marker id="tut-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 z" fill="#9aa5cc" />
            </marker>
          </defs>
          <text x={12} y={H / 2} fill="#9aa5cc" fontSize={9} transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">
            time
          </text>
        </svg>
      );
    case "ask":
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <defs>
            <filter id="tut-blur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation={6} />
            </filter>
          </defs>
          <g filter="url(#tut-blur)">
            <ellipse cx={60} cy={50} rx={26} ry={20} fill={C1} opacity={0.5} />
            <ellipse cx={100} cy={50} rx={26} ry={20} fill={C1} opacity={0.5} />
          </g>
          <text x={80} y={92} fill="#9aa5cc" fontSize={10} textAnchor="middle">
            before: 0.50 · 0.50
          </text>
          <path d="M 118 50 L 140 50" stroke="#9aa5cc" strokeWidth={1.5} markerEnd="url(#tut-arrow2)" />
          <defs>
            <marker id="tut-arrow2" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 z" fill="#9aa5cc" />
            </marker>
          </defs>
          <g filter="url(#tut-blur)">
            <ellipse cx={170} cy={50} rx={26} ry={20} fill={C1} opacity={0.98} />
            <ellipse cx={210} cy={50} rx={26} ry={20} fill={C1} opacity={0.06} />
          </g>
          <text x={190} y={92} fill="#e8ecf7" fontSize={10} textAnchor="middle">
            asked: 1.00 · 0.00
          </text>
          <text x={128} y={30} fill="#f2c98a" fontSize={10} textAnchor="middle">
            ask
          </text>
        </svg>
      );
    case "braid":
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {/* internal crossing: two strands of one cohort swap */}
          <path d={`M 60 ${H - 10} C 60 70, 90 50, 90 10`} stroke={C1} strokeWidth={3} fill="none" strokeOpacity={0.6} />
          <path d={`M 90 ${H - 10} C 90 70, 60 50, 60 10`} stroke="#141d3a" strokeWidth={8} fill="none" />
          <path d={`M 90 ${H - 10} C 90 70, 60 50, 60 10`} stroke={C1} strokeWidth={3} fill="none" />
          <text x={75} y={H} fill={C1} fontSize={10} textAnchor="middle">
            σ₁ ritual
          </text>
          {/* exchange: inner strands of two cohorts swap */}
          {strand(136, C1, 0.95)}
          {strand(204, C2, 0.6)}
          <path d={`M 160 ${H - 10} C 160 70, 180 50, 180 10`} stroke={C2} strokeWidth={3} fill="none" strokeOpacity={0.95} />
          <path d={`M 180 ${H - 10} C 180 70, 160 50, 160 10`} stroke="#141d3a" strokeWidth={8} fill="none" />
          <path d={`M 180 ${H - 10} C 180 70, 160 50, 160 10`} stroke={C1} strokeWidth={3} fill="none" strokeOpacity={0.6} />
          <text x={170} y={H} fill={C2} fontSize={10} textAnchor="middle">
            σ₂ exchange
          </text>
        </svg>
      );
    case "coherence": {
      const r = 40;
      const cx = 70;
      const cy = 64;
      const arc = (from: number, to: number, color: string, w: number) => {
        const a0 = Math.PI * (1 + from);
        const a1 = Math.PI * (1 + to);
        const x0 = cx + r * Math.cos(a0);
        const y0 = cy + r * Math.sin(a0);
        const x1 = cx + r * Math.cos(a1);
        const y1 = cy + r * Math.sin(a1);
        return <path d={`M ${x0} ${y0} A ${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x1} ${y1}`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />;
      };
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {arc(0, 1, "#2a3563", 8)}
          {arc(0, 0.72, "#9af2b5", 8)}
          {arc(0.34, 0.36, "#f28a8a", 12)}
          <text x={cx} y={cy + 4} fill="#e8ecf7" fontSize={18} fontWeight={600} textAnchor="middle">
            72
          </text>
          <text x={cx} y={cy + 22} fill="#9aa5cc" fontSize={9} textAnchor="middle">
            coherence
          </text>
          <text x={150} y={40} fill="#9aa5cc" fontSize={10}>
            asking spends it
          </text>
          <text x={150} y={58} fill="#9aa5cc" fontSize={10}>
            deprivation erodes it
          </text>
          <text x={150} y={76} fill="#9aa5cc" fontSize={10}>
            care protects it
          </text>
          <text x={150} y={94} fill="#f28a8a" fontSize={10}>
            below the mark: collapse
          </text>
        </svg>
      );
    }
    case "help":
      return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          <rect x={20} y={40} width={70} height={32} rx={8} fill="#f2c98a" />
          <text x={55} y={61} fill="#0b1020" fontSize={13} fontWeight={600} textAnchor="middle">
            Stuck?
          </text>
          <rect x={100} y={40} width={56} height={32} rx={8} fill="none" stroke="#2a3563" />
          <text x={128} y={61} fill="#e8ecf7" fontSize={13} textAnchor="middle">
            Help
          </text>
          <rect x={166} y={40} width={56} height={32} rx={8} fill="none" stroke="#2a3563" />
          <text x={194} y={61} fill="#e8ecf7" fontSize={13} textAnchor="middle">
            Map
          </text>
        </svg>
      );
  }
}

export function TutorialModal({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const p = TUTORIAL[page];
  const last = page === TUTORIAL.length - 1;
  return (
    <Modal
      kicker={`How to play · ${page + 1} of ${TUTORIAL.length}`}
      title={p.title}
      actions={
        <>
          <Btn onClick={onDone}>{last ? "Close" : "Skip"}</Btn>
          {page > 0 && <Btn onClick={() => setPage(page - 1)}>Back</Btn>}
          <Btn primary onClick={() => (last ? onDone() : setPage(page + 1))}>
            {last ? "Play" : "Next"}
          </Btn>
        </>
      }
    >
      <div className="flex justify-center rounded-lg bg-bg-2 border border-line py-2 mb-3">
        <Art kind={p.art} />
      </div>
      {p.body.map((t, i) => (
        <p key={i} className={i > 0 ? "mt-2" : ""}>
          {t}
        </p>
      ))}
      <div className="mt-3 flex gap-1.5 justify-center" aria-hidden>
        {TUTORIAL.map((_, i) => (
          <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === page ? "bg-accent" : "bg-line"}`} />
        ))}
      </div>
    </Modal>
  );
}
