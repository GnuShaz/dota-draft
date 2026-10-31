import { useState } from "react";
import type { HeroMeta } from "@dota-draft/core";

// Базовый адрес портретов, при смене CDN правится здесь.
const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/";

const ALIASES: Record<string, string[]> = {
  "anti-mage": ["am"], "shadow fiend": ["sf"], "queen of pain": ["qop"],
  "nature's prophet": ["np", "furion"], "phantom assassin": ["pa"],
  "phantom lancer": ["pl"], "crystal maiden": ["cm"], "death prophet": ["dp"],
  "dark seer": ["ds"], "wraith king": ["wk"], "faceless void": ["void", "fv"],
  "treant protector": ["treant"], "outworld destroyer": ["od"],
  "templar assassin": ["ta"], "spirit breaker": ["sb"], "troll warlord": ["troll"],
  "naga siren": ["naga"], "bounty hunter": ["bh"], "chaos knight": ["ck"],
  "centaur warrunner": ["cent"], io: ["wisp"], lifestealer: ["naix"],
  "vengeful spirit": ["venge"], clockwerk: ["clock"], "keeper of the light": ["kotl"],
  "legion commander": ["lc"], "skywrath mage": ["sky"], "witch doctor": ["wd"],
  "shadow shaman": ["ss"], "storm spirit": ["storm"], "ember spirit": ["ember"],
  "earth spirit": ["earth"], "arc warden": ["aw"], "abyssal underlord": ["pit"],
};

export function searchHeroes(
  heroes: HeroMeta[],
  query: string,
  taken: Set<number>,
  limit = 6,
): HeroMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: [number, HeroMeta][] = [];
  for (const h of heroes) {
    if (taken.has(h.id)) continue;
    const name = h.localizedName.toLowerCase();
    const al = ALIASES[name] ?? [];
    let s = -1;
    if (name.startsWith(q) || al.includes(q)) s = 0;
    else if (al.some((a) => a.startsWith(q)) || name.split(/[\s-]+/).some((w) => w.startsWith(q))) s = 1;
    else if (name.includes(q)) s = 2;
    if (s >= 0) scored.push([s, h]);
  }
  return scored
    .sort((a, b) => a[0] - b[0] || a[1].localizedName.localeCompare(b[1].localizedName))
    .slice(0, limit)
    .map((x) => x[1]);
}

export type PortraitSize = "sm" | "lg" | "xl" | "fill";

export function Portrait({ hero, size = "lg" }: { hero: HeroMeta; size?: PortraitSize }) {
  const [failed, setFailed] = useState(false);
  const cls = `portrait ${size}`;
  if (failed) return <div className={`${cls} fallback`}>{hero.localizedName.slice(0, 2)}</div>;
  return (
    <img
      className={cls}
      src={`${CDN}${hero.name.replace("npc_dota_hero_", "")}.png`}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}