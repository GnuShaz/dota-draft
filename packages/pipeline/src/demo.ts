import { readFileSync } from "node:fs";
import { recommend } from "@dota-draft/core";
import type { Bracket, Position, RecommendOptions, Snapshot } from "@dota-draft/core";

const [bracketArg, posArg, enemiesArg = "none", alliesArg = "none"] =
  process.argv.slice(2);
if (!bracketArg || !posArg) {
  console.log('Использование: pnpm demo <ранг> <позиция 1-5> "<враги через запятую | none>" "<союзники | none>"');
  console.log('Опции формулы: $env:OPTS = \'{"baseWeight":0.5}\'');
  process.exit(1);
}

const snap: Snapshot = JSON.parse(readFileSync("data/snapshot.json", "utf8"));
const byName = new Map(snap.heroes.map((h) => [h.localizedName.toLowerCase(), h.id]));
const names = new Map(snap.heroes.map((h) => [h.id, h.localizedName]));

function parse(list: string): number[] {
  if (list === "none") return [];
  return list.split(",").map((s) => {
    const id = byName.get(s.trim().toLowerCase());
    if (id === undefined) throw new Error(`Не нашёл героя "${s.trim()}"`);
    return id;
  });
}

const data = snap.brackets[bracketArg as Bracket];
if (!data) throw new Error(`Нет ранга ${bracketArg}`);

const position = Number(posArg) as Position;
const opts: RecommendOptions = process.env.OPTS ? JSON.parse(process.env.OPTS) : {};
if (process.env.OPTS) console.log("опции:", opts);

const res = recommend(
  data,
  position,
  { enemies: parse(enemiesArg), allies: parse(alliesArg) },
  opts,
);

for (const r of res) {
  const baseGames = data.byPosition[position]?.[r.heroId]?.games ?? 0;
  const why = r.reasons
    .slice(0, 3)
    .map((x) => {
      const pp = `${x.ppEffect >= 0 ? "+" : ""}${x.ppEffect.toFixed(1)}`;
      return `${pp} ${x.kind} ${names.get(x.heroId)} (${x.games})`;
    })
    .join(", ");
  console.log(
    `${(r.winProb * 100).toFixed(1)}% (база ${(r.baseWinProb * 100).toFixed(1)}%, ${baseGames} игр)  ${names.get(r.heroId)}  ${why}`,
  );
}