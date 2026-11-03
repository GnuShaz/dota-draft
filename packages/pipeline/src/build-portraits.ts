import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { DESC_H, DESC_VERSION, DESC_W, VIEWS, refViewsRaw } from "@dota-draft/core";

// Тот же адрес, что использует сайт для портретов.
const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/";

const snap = JSON.parse(readFileSync("data/snapshot.json", "utf8")) as {
  heroes: { id: number; name: string }[];
};

const out: Record<string, string> = {};
let failed = 0;
for (const h of snap.heroes) {
  const short = h.name.replace("npc_dota_hero_", "");
  try {
    const r = await fetch(`${CDN}${short}.png`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const png = PNG.sync.read(Buffer.from(await r.arrayBuffer()));
    const raw = refViewsRaw({ width: png.width, height: png.height, data: png.data });
    out[String(h.id)] = Buffer.from(raw).toString("base64");
  } catch (e) {
    failed++;
    console.log(`  ${short}: ${e instanceof Error ? e.message : e}`);
  }
}

const done = Object.keys(out).length;
console.log(`эталонов: ${done}, ошибок: ${failed}`);
if (done < 100) {
  console.log("Слишком мало эталонов, файл не записан.");
  process.exit(1);
}

mkdirSync("data", { recursive: true });
writeFileSync(
  "data/portraits.json",
  JSON.stringify({ ver: DESC_VERSION, w: DESC_W, h: DESC_H, views: VIEWS, heroes: out }),
);
console.log("Записано: data/portraits.json");