import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/";
const OUT = "packages/web/public/ranks";

const res = await fetch(BASE + "files.json");
if (!res.ok) throw new Error(`files.json: HTTP ${res.status}`);
const { files } = (await res.json()) as { files: [string, number][] };
const paths = files.map((f) => f[0]);

// Медали лежат в panorama/images/rank_tier_icons/: rankN_psd.png (N = 1..8)
// и такие же уменьшенные в папке mini/.
const full = new Map<number, string>();
const mini = new Map<number, string>();
for (const p of paths) {
  const m = p.match(/rank_tier_icons\/(mini\/)?rank(\d)_psd\.png$/);
  if (!m) continue;
  const tier = Number(m[2]);
  if (tier < 1 || tier > 8) continue;
  (m[1] ? mini : full).set(tier, p);
}

const chosen = new Map<number, { path: string; kind: string }>();
for (let tier = 1; tier <= 8; tier++) {
  const f = full.get(tier);
  const s = mini.get(tier);
  if (f) chosen.set(tier, { path: f, kind: "полный размер" });
  else if (s) chosen.set(tier, { path: s, kind: "mini" });
}

if (chosen.size < 8) {
  console.log(`Нашлось ${chosen.size} из 8. Всё, что лежит в rank_tier_icons (кроме handicap):`);
  for (const p of paths) {
    if (p.includes("rank_tier_icons/") && !p.includes("/handicap/")) console.log("  " + p);
  }
  console.log("\nПришли этот вывод, я поправлю имена.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (let tier = 1; tier <= 8; tier++) {
  const { path, kind } = chosen.get(tier)!;
  const r = await fetch(BASE + encodeURI(path));
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(`${OUT}/${tier}.png`, buf);
  console.log(`${tier}.png (${kind}, ${buf.length} байт) <- ${path}`);
}
console.log("Готово.");