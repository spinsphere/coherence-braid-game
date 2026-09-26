// Title mark: three strands braided, drawn procedurally.
export function BraidMark({ size = 96, className = "" }: { size?: number; className?: string }) {
  const colors = ["#f2c98a", "#8ad3f2", "#f2a1c8"];
  const w = 60;
  const h = 100;
  // three strands, positions 0..2 (x = 10, 30, 50); crossings alternate s1, s2
  const xs = [10, 30, 50];
  let pos = [0, 1, 2];
  const rows = [1, 2, 1, 2, 1, 2];
  const rowH = h / rows.length;
  const paths: { d: string; color: string; over: boolean; key: string }[] = [];
  rows.forEach((k, r) => {
    const yb = h - r * rowH;
    const yt = h - (r + 1) * rowH;
    const next = [...pos];
    const a = pos.indexOf(k - 1);
    const b = pos.indexOf(k);
    next[a] = k;
    next[b] = k - 1;
    for (let s = 0; s < 3; s++) {
      const x0 = xs[pos[s]];
      const x1 = xs[next[s]];
      const d = x0 === x1 ? `M ${x0} ${yb} L ${x1} ${yt}` : `M ${x0} ${yb} C ${x0} ${yb - rowH / 2}, ${x1} ${yt + rowH / 2}, ${x1} ${yt}`;
      paths.push({ d, color: colors[s], over: s === a, key: `${r}-${s}` });
    }
    pos = next;
  });
  return (
    <svg width={size} height={(size * h) / w} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden="true">
      {paths
        .filter((p) => !p.over)
        .map((p) => (
          <path key={p.key} d={p.d} stroke={p.color} strokeWidth={3.5} fill="none" strokeLinecap="round" />
        ))}
      {paths
        .filter((p) => p.over)
        .map((p) => (
          <g key={p.key}>
            <path d={p.d} stroke="var(--bg)" strokeWidth={9} fill="none" />
            <path d={p.d} stroke={p.color} strokeWidth={3.5} fill="none" strokeLinecap="round" />
          </g>
        ))}
    </svg>
  );
}
