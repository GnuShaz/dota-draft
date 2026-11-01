import { useState } from "react";
import type { HeroMeta } from "@dota-draft/core";

export { searchHeroes } from "./search";
export type { Hero } from "./search";

// Базовый адрес портретов, при смене CDN правится здесь.
const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/";

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