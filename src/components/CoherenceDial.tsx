"use client";

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

export function CoherenceDial({ value, threshold, size = 168 }: { value: number; threshold: number; size?: number }) {
  const cx = 84;
  const cy = 84;
  const r = 66;
  const a0 = -120;
  const a1 = 120;
  const v = Math.max(0, Math.min(1, value));
  const av = a0 + (a1 - a0) * v;
  const at = a0 + (a1 - a0) * threshold;
  const danger = v < threshold + 0.08;
  const color = v < threshold ? "#f28a8a" : danger ? "#f2c98a" : "#9af2b5";
  const [tx0, ty0] = polar(cx, cy, r - 10, at);
  const [tx1, ty1] = polar(cx, cy, r + 8, at);
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 168 134" role="img" aria-label={`Coherence ${Math.round(v * 100)} of 100, threshold ${Math.round(threshold * 100)}`}>
      <path d={arc(cx, cy, r, a0, a1)} stroke="#2a3563" strokeWidth={10} fill="none" strokeLinecap="round" />
      {v > 0.005 && <path d={arc(cx, cy, r, a0, av)} stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" style={{ transition: "d 250ms" }} />}
      <line x1={tx0} y1={ty0} x2={tx1} y2={ty1} stroke="#e8ecf7" strokeWidth={2} />
      <text x={cx} y={cy + 6} fill="#e8ecf7" fontSize={34} textAnchor="middle" fontWeight={600}>
        {Math.round(v * 100)}
      </text>
      <text x={cx} y={cy + 24} fill="#9aa5cc" fontSize={10} textAnchor="middle">
        coherence · Tr ρ²
      </text>
      <text x={cx} y={cy + 44} fill="#5a6690" fontSize={9} textAnchor="middle">
        collapse below {Math.round(threshold * 100)}
      </text>
    </svg>
  );
}
