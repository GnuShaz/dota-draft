import type { Bracket } from "@dota-draft/core";

export interface RankDef {
  id: string;
  name: string;
  group: Bracket;
  color: string;
}

export const RANKS: RankDef[] = [
  { id: "herald", name: "Рекрут", group: "herald_guardian", color: "#a08a6e" },
  { id: "guardian", name: "Страж", group: "herald_guardian", color: "#b3ad9f" },
  { id: "crusader", name: "Рыцарь", group: "crusader_archon", color: "#8fa8b5" },
  { id: "archon", name: "Герой", group: "crusader_archon", color: "#63ad9f" },
  { id: "legend", name: "Легенда", group: "legend_ancient", color: "#6b9bd6" },
  { id: "ancient", name: "Властелин", group: "legend_ancient", color: "#9a7fd0" },
  { id: "divine", name: "Божество", group: "divine_immortal", color: "#e3b04b" },
  { id: "immortal", name: "Титан", group: "divine_immortal", color: "#e8705f" },
];

const GROUP_IDS: Bracket[] = [
  "herald_guardian",
  "crusader_archon",
  "legend_ancient",
  "divine_immortal",
];

export const GROUPS = GROUP_IDS.map((id) => {
  const ranks = RANKS.filter((r) => r.group === id);
  return { id, ranks, label: ranks.map((r) => r.name).join("–") };
});

function Glyph({ id, color }: { id: string; color: string }) {
  const s = {
    stroke: color,
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  switch (id) {
    case "herald":
      return <path d="M16 21 L24 29 L32 21" {...s} />;
    case "guardian":
      return (
        <path
          d="M24 14 L33 17 V25 C33 30 29 33 24 35 C19 33 15 30 15 25 V17 Z"
          {...s}
          strokeWidth={2.5}
        />
      );
    case "crusader":
      return <path d="M24 14 V34 M16 22 H32" {...s} strokeWidth={3.5} />;
    case "archon":
      return (
        <path
          d="M15 31 L17 19 L21 25 L24 17 L27 25 L31 19 L33 31 Z"
          fill={color}
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      );
    case "legend":
      return (
        <polygon
          points="24,13 26.7,20.28 34.46,20.6 28.37,25.42 30.47,32.9 24,28.6 17.53,32.9 19.63,25.42 13.54,20.6 21.3,20.28"
          fill={color}
        />
      );
    case "ancient":
      return (
        <>
          <path d="M24 13 L34 24 L24 35 L14 24 Z" {...s} strokeWidth={2.5} />
          <path d="M24 19 L29 24 L24 29 L19 24 Z" fill={color} />
        </>
      );
    case "divine":
      return (
        <>
          <circle cx="24" cy="24" r="4.5" fill={color} />
          <path
            d="M24 12 V16 M24 32 V36 M12 24 H16 M32 24 H36 M32.13 15.87 L29.66 18.34 M32.13 32.13 L29.66 29.66 M15.87 32.13 L18.34 29.66 M15.87 15.87 L18.34 18.34"
            {...s}
            strokeWidth={2.5}
          />
        </>
      );
    default:
      return (
        <>
          <rect x="17" y="17" width="14" height="14" {...s} strokeWidth={2.5} />
          <rect
            x="17"
            y="17"
            width="14"
            height="14"
            transform="rotate(45 24 24)"
            {...s}
            strokeWidth={2.5}
          />
          <circle cx="24" cy="24" r="2.2" fill={color} />
        </>
      );
  }
}

export function RankMedal({ rank, size = 30 }: { rank: RankDef; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={rank.name}>
      <title>{rank.name}</title>
      <circle cx="24" cy="24" r="22" fill={rank.color} />
      <circle cx="24" cy="24" r="18.5" fill="#182026" />
      <Glyph id={rank.id} color={rank.color} />
    </svg>
  );
}