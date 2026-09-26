import type { EntityId } from "@/game/contact";

// Abstract silhouettes from simple shapes: no likenesses, nothing copied.
export function EntitySilhouette({ id, size = 160 }: { id: EntityId; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 100 100", "aria-hidden": true as const };
  const ink = "#e8ecf7";
  switch (id) {
    case "greys":
      return (
        <svg {...common}>
          <ellipse cx={50} cy={34} rx={20} ry={24} fill={ink} opacity={0.85} />
          <ellipse cx={41} cy={36} rx={7} ry={4} fill="#0b1020" transform="rotate(-20 41 36)" />
          <ellipse cx={59} cy={36} rx={7} ry={4} fill="#0b1020" transform="rotate(20 59 36)" />
          <rect x={46} y={56} width={8} height={8} fill={ink} opacity={0.85} />
          <path d="M30 96 Q50 56 70 96 Z" fill={ink} opacity={0.7} />
        </svg>
      );
    case "nordics":
      return (
        <svg {...common}>
          <defs>
            <radialGradient id="glow">
              <stop offset="0" stopColor="#fff7d6" stopOpacity={0.9} />
              <stop offset="1" stopColor="#fff7d6" stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={50} cy={40} r={38} fill="url(#glow)" />
          <circle cx={50} cy={22} r={9} fill={ink} />
          <path d="M38 98 L42 34 L58 34 L62 98 Z" fill={ink} opacity={0.85} />
        </svg>
      );
    case "hairy-dwarfs":
      return (
        <svg {...common}>
          <circle cx={50} cy={48} r={12} fill={ink} />
          <path d="M28 98 Q28 60 50 58 Q72 60 72 98 Z" fill={ink} opacity={0.85} />
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={30 + i * 3} y1={60 + (i % 3) * 4} x2={26 + i * 3.4} y2={98} stroke={ink} strokeWidth={1.2} opacity={0.6} />
          ))}
          <rect x={20} y={90} width={60} height={4} fill={ink} opacity={0.3} />
        </svg>
      );
    case "giants":
      return (
        <svg {...common}>
          <path d="M0 100 L0 70 L20 60 L40 66 L60 52 L80 62 L100 56 L100 100 Z" fill={ink} opacity={0.25} />
          <circle cx={62} cy={24} r={5} fill={ink} />
          <path d="M55 30 L69 30 L72 60 L52 60 Z" fill={ink} opacity={0.9} />
        </svg>
      );
    case "human-passing":
      return (
        <svg {...common}>
          <circle cx={50} cy={24} r={10} fill={ink} />
          <path d="M34 98 L38 40 L62 40 L66 98 Z" fill={ink} opacity={0.85} />
          <circle cx={50} cy={24} r={10} fill="none" stroke="#f2c98a" strokeWidth={1.5} strokeDasharray="3 3" />
          <path d="M34 98 L38 40 L62 40 L66 98 Z" fill="none" stroke="#f2c98a" strokeWidth={1.5} strokeDasharray="3 3" />
        </svg>
      );
    case "amphibians":
      return (
        <svg {...common}>
          <path d="M0 78 Q25 70 50 78 T100 78 L100 100 L0 100 Z" fill="#8ad3f2" opacity={0.35} />
          <ellipse cx={50} cy={50} rx={16} ry={20} fill={ink} opacity={0.85} />
          <circle cx={42} cy={42} r={4} fill="#0b1020" />
          <circle cx={58} cy={42} r={4} fill="#0b1020" />
          <path d="M30 80 Q50 66 70 80" stroke={ink} strokeWidth={3} fill="none" opacity={0.7} />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <defs>
            <radialGradient id="lum">
              <stop offset="0" stopColor="#d1b0ff" stopOpacity={1} />
              <stop offset="1" stopColor="#d1b0ff" stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={50} cy={50} r={40} fill="url(#lum)" />
          <polygon points="50,20 76,65 24,65" fill="none" stroke={ink} strokeWidth={1.5} opacity={0.8} />
          <polygon points="50,80 24,35 76,35" fill="none" stroke={ink} strokeWidth={1.5} opacity={0.8} />
          <circle cx={50} cy={50} r={6} fill={ink} />
        </svg>
      );
  }
}
